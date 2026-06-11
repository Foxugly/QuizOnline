import logging

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from domain.models import Domain, DomainJoinRequest
from domain.serializers import DomainJoinRequestReadSerializer
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
    extend_schema_view,
)
from quiz.models import Quiz
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from config.tools import ErrorDetailSerializer

from .permissions import IsSelf, IsSelfOrStaffOrSuperuser, IsSuperuserOnly
from .turnstile import get_remote_ip, turnstile_enabled, verify_turnstile_token
from .services import (
    change_password,
    confirm_email,
    confirm_password_reset,
    exchange_magic_link,
    register_user,
    request_magic_link,
    request_password_reset,
)
from .serializers import (
    CustomUserAdminUpdateSerializer,
    CustomUserCreateSerializer,
    CustomUserProfileUpdateSerializer,
    CustomUserReadSerializer,
    EmailConfirmationSerializer,
    MagicLinkExchangeRequestSerializer,
    MagicLinkExchangeResponseSerializer,
    MagicLinkRequestSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetOKSerializer,
    PasswordResetRequestSerializer,
    QuizSimpleSerializer,
    SetCurrentDomainSerializer,
)
from .throttling import (
    EmailConfirmRateThrottle,
    MagicLinkExchangeRateThrottle,
    MagicLinkRequestRateThrottle,
    PasswordResetConfirmRateThrottle,
    PasswordResetRateThrottle,
)
from .magic_link_token import (
    MagicLinkTokenExpired,
    MagicLinkTokenInvalid,
    parse_magic_link_token,
)
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)
User = get_user_model()


@extend_schema_view(
    list=extend_schema(
        tags=["User"],
        summary="Lister les utilisateurs",
        description="Admin/staff uniquement.",
        responses={
            200: CustomUserReadSerializer(many=True),
            401: OpenApiResponse(response=ErrorDetailSerializer, description="Unauthorized"),
            403: OpenApiResponse(response=ErrorDetailSerializer, description="Forbidden (admin only)"),
        },
    ),
    create=extend_schema(
        tags=["User"],
        summary="Créer un utilisateur",
        description="Création ouverte (AllowAny).",
        request=CustomUserCreateSerializer,
        responses={
            201: CustomUserReadSerializer,
            400: OpenApiResponse(description="Validation error"),
        },
    ),
    retrieve=extend_schema(
        tags=["User"],
        summary="Récupérer un utilisateur",
        responses={
            200: CustomUserReadSerializer,
            401: OpenApiResponse(response=ErrorDetailSerializer, description="Unauthorized"),
            403: OpenApiResponse(response=ErrorDetailSerializer, description="Forbidden"),
            404: OpenApiResponse(response=ErrorDetailSerializer, description="Not found"),
        },
    ),
    update=extend_schema(
        tags=["User"],
        summary="Mettre à jour un utilisateur (PUT)",
        request=CustomUserAdminUpdateSerializer,
        responses={200: CustomUserReadSerializer},
    ),
    partial_update=extend_schema(
        tags=["User"],
        summary="Mettre à jour un utilisateur (PATCH)",
        request=CustomUserAdminUpdateSerializer,
        responses={200: CustomUserReadSerializer},
    ),
    me=extend_schema(
        tags=["User"],
        summary="Récupérer et mettre à jour mon profil",
        description="Retourne le profil de l'utilisateur authentifié.",
        request=CustomUserProfileUpdateSerializer,
        responses={
            200: CustomUserReadSerializer,
            400: OpenApiResponse(response=ErrorDetailSerializer, description="Validation error"),
            401: OpenApiResponse(response=ErrorDetailSerializer, description="Unauthorized"),
            403: OpenApiResponse(response=ErrorDetailSerializer, description="Forbidden"),
        },
    ),
    set_current_domain=extend_schema(
        tags=["User"],
        summary="Définir mon domaine courant",
        description="Met à jour `current_domain` sur l'utilisateur authentifié, puis renvoie le profil mis à jour.",
        request=SetCurrentDomainSerializer,
        responses={
            200: CustomUserReadSerializer,
            400: OpenApiResponse(description="Validation error"),
            401: OpenApiResponse(response=ErrorDetailSerializer, description="Unauthorized"),
            403: OpenApiResponse(response=ErrorDetailSerializer, description="Forbidden"),
        },
    ),
)
class CustomUserViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    lookup_field = "pk"
    lookup_url_kwarg = "user_id"
    queryset = User.objects.none()
    lookup_value_regex = r"\d+"

    @staticmethod
    def _user_queryset():
        from django.db.models import Prefetch
        return (
            User.objects
            .select_related("current_domain")
            .prefetch_related(
                "owned_domains",
                "linked_domains",
                "managed_domains",
                # Pending join requests are surfaced per-row by
                # ``CustomUserReadSerializer.get_pending_join_requests``;
                # without this Prefetch the superuser user list ran one
                # extra query per user. The serializer reads the cache via
                # ``_prefetched_objects_cache["pending_join_requests"]``.
                Prefetch(
                    "domain_join_requests",
                    queryset=DomainJoinRequest.objects.filter(
                        status=DomainJoinRequest.STATUS_PENDING
                    ).order_by("-created_at"),
                ),
            )
            .order_by("id")
        )

    def get_queryset(self):
        qs = self._user_queryset()
        user = self.request.user
        if not getattr(user, "is_authenticated", False):
            return qs.none()
        if getattr(user, "is_superuser", False):
            return qs

        # Non-superuser staff: restrict visibility to users that share at
        # least one domain with the requester (where the requester is owner
        # or manager). A staff user with no managed/owned domain only sees
        # themselves — this prevents the global address-book leak that the
        # member_role privilege escalation could otherwise be chained with.
        scoped_domain_ids = list(
            Domain.objects
            .filter(Q(owner=user) | Q(managers=user))
            .values_list("id", flat=True)
            .distinct()
        )
        if not scoped_domain_ids:
            return qs.filter(pk=user.pk)
        return qs.filter(
            Q(pk=user.pk)
            | Q(linked_domains__in=scoped_domain_ids)
            | Q(managed_domains__in=scoped_domain_ids)
            | Q(owned_domains__in=scoped_domain_ids)
        ).distinct()

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        if self.action == "list":
            return [IsSuperuserOnly()]
        if self.action == "destroy":
            return [IsAuthenticated(), IsSuperuserOnly()]
        if self.action in ("me", "set_current_domain", "me_join_requests"):
            return [IsSelf()]
        return [IsSelfOrStaffOrSuperuser()]

    def create(self, request, *args, **kwargs):
        # Server-side Turnstile check before any validation/DB write. Gated on
        # the secret: when none is configured the captcha is not yet provisioned
        # so we skip it (register keeps working). Once configured it is
        # fail-closed — a missing/invalid token returns captcha_failed.
        if turnstile_enabled():
            token = request.data.get("turnstile_token") or ""
            if not verify_turnstile_token(token, remote_ip=get_remote_ip(request)):
                return Response(
                    {"code": "captcha_failed", "detail": "Captcha verification failed. Please try again."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        register_user(serializer)

    def get_serializer_class(self):
        if self.action == "create":
            return CustomUserCreateSerializer
        if self.action in ["update", "partial_update"]:
            if self.request.user.is_staff or self.request.user.is_superuser:
                return CustomUserAdminUpdateSerializer
            return CustomUserProfileUpdateSerializer
        return CustomUserReadSerializer

    @action(detail=False, methods=["get", "patch"], url_path="me")
    def me(self, request):
        user = self.get_queryset().get(pk=request.user.pk)
        if request.method.lower() == "get":
            serializer = CustomUserReadSerializer(user, context={"request": request})
            return Response(serializer.data, status=status.HTTP_200_OK)

        serializer = CustomUserProfileUpdateSerializer(
            user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        user = self.get_queryset().get(pk=user.pk)
        return Response(
            CustomUserReadSerializer(user, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="me/current-domain")
    def set_current_domain(self, request):
        serializer = SetCurrentDomainSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()

        user = self.get_queryset().get(pk=request.user.pk)
        out = CustomUserReadSerializer(user, context={"request": request})
        return Response(out.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="me/join-requests")
    def me_join_requests(self, request):
        qs = (
            DomainJoinRequest.objects
            .filter(user=request.user, status=DomainJoinRequest.STATUS_PENDING)
            .order_by("-created_at")
        )
        return Response(DomainJoinRequestReadSerializer(qs, many=True).data)

    @extend_schema(
        tags=["User"],
        summary="Export GDPR : toutes les données du compte courant",
        description=(
            "Retourne un dump JSON de toutes les données personnelles "
            "associées au compte de l'utilisateur connecté. Couvre le "
            "profil, les domaines (owned / managed / membre), les demandes "
            "d'adhésion et les sessions de quiz. Pensé pour le droit "
            "d'accès / portabilité du RGPD : le frontend télécharge la "
            "réponse en ``application/json`` sous le nom "
            "``quizonline-export-<username>.json``."
        ),
        responses={status.HTTP_200_OK: OpenApiTypes.OBJECT},
    )
    @action(detail=False, methods=["get"], url_path="me/export")
    def me_export(self, request):
        user = request.user
        owned = list(
            Domain.objects.filter(owner=user)
            .values("id", "active", "public", "created_at")
        )
        managed = list(
            Domain.objects.filter(managers=user)
            .exclude(owner=user)
            .values("id", "active", "public", "created_at")
        )
        member_of = list(
            Domain.objects.filter(members=user)
            .exclude(owner=user)
            .exclude(managers=user)
            .values("id", "active", "public", "created_at")
        )
        join_requests = list(
            DomainJoinRequest.objects.filter(user=user)
            .order_by("-created_at")
            .values("id", "domain_id", "status", "created_at", "decided_at", "reason")
        )
        quizzes = list(
            Quiz.objects.filter(user=user)
            .order_by("-created_at")
            .values(
                "id", "quiz_template_id", "started_at", "ended_at",
                "earned_score", "max_score", "max_questions", "created_at",
            )
        )

        payload = {
            "exported_at": timezone.now().isoformat(),
            "profile": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "language": getattr(user, "language", ""),
                "is_active": user.is_active,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "date_joined": user.date_joined.isoformat() if user.date_joined else None,
                "last_login": user.last_login.isoformat() if user.last_login else None,
                "notification_prefs": getattr(user, "notification_prefs", {}) or {},
            },
            "domains": {
                "owned": owned,
                "managed": managed,
                "member_of": member_of,
            },
            "join_requests": join_requests,
            "quizzes": quizzes,
        }
        return Response(payload, status=status.HTTP_200_OK)

    @extend_schema(
        tags=["User"],
        summary="Supprimer son compte (droit à l'effacement RGPD)",
        description=(
            "Supprime définitivement le compte de l'utilisateur connecté.\n\n"
            "**Garde-fou** : refuse avec ``409 Conflict`` si l'utilisateur "
            "possède encore au moins un domaine actif. Il doit d'abord "
            "transférer la propriété (``POST /api/domain/{id}/transfer/``) "
            "ou désactiver/supprimer le domaine. Cela évite de laisser "
            "un domaine orphelin sans propriétaire.\n\n"
            "**Effets en cascade** : tout le contenu créé par l'utilisateur "
            "et lié par FK reste (questions / quiz / sujets ne perdent pas "
            "leurs métadonnées de création). Les liens M2M (managers / "
            "members) sont nettoyés automatiquement par Django."
        ),
        request=None,
        responses={
            status.HTTP_204_NO_CONTENT: OpenApiResponse(description="Account deleted."),
            status.HTTP_409_CONFLICT: ErrorDetailSerializer,
        },
    )
    @me.mapping.delete
    def me_delete(self, request):
        user = request.user
        # ``Domain.owner`` is on_delete=PROTECT, so any owned row — active
        # or not — blocks ``user.delete()``. Surface that as a clean 409
        # with a count rather than letting the DB-level ProtectedError
        # bubble up as a 500.
        owned_count = Domain.objects.filter(owner=user).count()
        if owned_count > 0:
            return Response(
                {
                    "detail": "owner_of_domains",
                    "owned_count": owned_count,
                },
                status=status.HTTP_409_CONFLICT,
            )
        # Capture the username before delete so the audit row keeps a
        # human-readable trace even though the FK becomes NULL.
        username = user.username
        user_id = user.id
        user.delete()
        logger.info(
            "user.self_delete",
            extra={"user_id": user_id, "username": username},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    get=extend_schema(
        tags=["User"],
        summary="Lister les quizzes d’un utilisateur",
        description=(
            "Retourne la liste des quiz liés à un utilisateur.\n"
            "Accès: soi-même ou staff/superuser."
        ),
        parameters=[
            OpenApiParameter(
                name="user_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
                description="ID utilisateur.",
            )
        ],
        responses={
            200: QuizSimpleSerializer(many=True),
            401: OpenApiResponse(response=ErrorDetailSerializer, description="Unauthorized"),
            403: OpenApiResponse(response=ErrorDetailSerializer, description="Forbidden"),
            404: OpenApiResponse(response=ErrorDetailSerializer, description="Not found"),
        },
    ),
)
class UserQuizListView(GenericAPIView):
    permission_classes = [IsSelfOrStaffOrSuperuser]
    serializer_class = QuizSimpleSerializer
    queryset = User.objects.none()
    lookup_field = "pk"
    lookup_url_kwarg = "user_id"

    @extend_schema(
        operation_id="user_quiz_list",
        description="Liste les quiz liés à un utilisateur donné.",
        responses={200: QuizSimpleSerializer(many=True)},
    )
    def get(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)

        requester = request.user
        # Access ladder (mirrors ``CustomUserViewSet.get_queryset`` scoping):
        #   - self always
        #   - superuser always
        #   - non-superuser staff ONLY when the target shares a domain the
        #     requester owns or manages. Plain ``is_staff`` is NOT enough —
        #     that was a cross-domain IDOR letting any staff manager read any
        #     user's quiz history regardless of domain.
        allowed = requester == user or getattr(requester, "is_superuser", False)
        if not allowed and getattr(requester, "is_staff", False):
            scoped_domain_ids = list(
                Domain.objects
                .filter(Q(owner=requester) | Q(managers=requester))
                .values_list("id", flat=True)
                .distinct()
            )
            if scoped_domain_ids:
                allowed = (
                    Q(linked_domains__in=scoped_domain_ids)
                    | Q(managed_domains__in=scoped_domain_ids)
                    | Q(owned_domains__in=scoped_domain_ids)
                )
                allowed = User.objects.filter(pk=user.pk).filter(allowed).exists()
        if not allowed:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Vous ne pouvez voir que vos propres quiz.")

        quiz = Quiz.objects.filter(user=user).select_related("quiz_template").order_by("-created_at")

        serializer = QuizSimpleSerializer(quiz, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        tags=["Auth"],
        summary="Demander un reset de mot de passe",
        description=(
            "Envoie un email avec un lien de réinitialisation.\n"
            "Répond toujours 200 pour ne pas révéler si l'email existe."
        ),
        request=PasswordResetRequestSerializer,
        responses={
            200: PasswordResetOKSerializer,
            400: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Validation error"),
        },
    ),
)
class PasswordResetRequestView(GenericAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Server-side Turnstile check before any DB query — gated on the secret,
        # fail-closed once configured (anti-leak 200 is preserved on success).
        if turnstile_enabled():
            token = serializer.validated_data.get("turnstile_token") or ""
            if not verify_turnstile_token(token, remote_ip=get_remote_ip(request)):
                return Response(
                    {"code": "captcha_failed", "detail": "Captcha verification failed. Please try again."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        email = serializer.validated_data["email"]
        request_password_reset(email, request)

        return Response(
            {"detail": "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé."},
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(
        tags=["Auth"],
        summary="Confirmer un reset de mot de passe",
        request=PasswordResetConfirmSerializer,
        responses={
            200: PasswordResetOKSerializer,
            400: OpenApiResponse(response=ErrorDetailSerializer, description="Lien invalide / token invalide"),
        },
    ),
)
class PasswordResetConfirmView(GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = PasswordResetConfirmSerializer
    throttle_classes = [PasswordResetConfirmRateThrottle]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password1"]

        user = confirm_password_reset(uid, token, new_password)
        if not user:
            return Response({"detail": "Lien invalide."}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"detail": "Mot de passe mis à jour avec succès."},
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(
        tags=["Auth"],
        summary="Changer son mot de passe",
        description="Utilisateur authentifié uniquement.",
        request=PasswordChangeSerializer,
        responses={
            200: PasswordResetOKSerializer,
            400: OpenApiResponse(
                response=ErrorDetailSerializer,
                description="Ancien mot de passe incorrect / validation",
            ),
            401: OpenApiResponse(response=ErrorDetailSerializer, description="Unauthorized"),
        },
    ),
)
class PasswordChangeView(GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PasswordChangeSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_password = serializer.validated_data["old_password"]
        new_password = serializer.validated_data["new_password"]

        user = request.user

        if not change_password(user, old_password, new_password):
            return Response({"detail": "Ancien mot de passe incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"detail": "Mot de passe modifié avec succès."},
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(
        tags=["Auth"],
        summary="Confirmer une adresse email",
        request=EmailConfirmationSerializer,
        responses={
            200: PasswordResetOKSerializer,
            400: OpenApiResponse(response=ErrorDetailSerializer, description="Lien invalide / token invalide"),
        },
    ),
)
class EmailConfirmView(GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = EmailConfirmationSerializer
    throttle_classes = [EmailConfirmRateThrottle]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]

        user = confirm_email(uid, token)
        if not user:
            return Response({"detail": "Lien invalide."}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"detail": "Adresse email confirmée avec succès."},
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Auth"],
    summary="Demander un lien magique de connexion",
    description=(
        "Envoie un lien de connexion par e-mail si un compte actif et "
        "confirmé existe pour cette adresse. Réponse identique dans tous les "
        "cas pour ne pas divulguer l'existence d'un compte."
    ),
    request=MagicLinkRequestSerializer,
    responses={status.HTTP_200_OK: ErrorDetailSerializer},
)
class MagicLinkRequestView(GenericAPIView):
    """``POST /api/auth/magic-link/request/`` — passwordless login mailer."""
    permission_classes = [AllowAny]
    throttle_classes = [MagicLinkRequestRateThrottle]
    serializer_class = MagicLinkRequestSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request_magic_link(serializer.validated_data["email"])
        # Constant-time response: same payload whether or not the user
        # exists. Frontend should simply tell the visitor to check their
        # inbox.
        return Response({"detail": "ok"}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Auth"],
    summary="Échanger un token magique contre une paire JWT",
    description=(
        "Valide la signature et la TTL du token, vérifie que l'utilisateur "
        "est actif et a confirmé son e-mail, puis émet une paire access / "
        "refresh comme l'endpoint password classique."
    ),
    request=MagicLinkExchangeRequestSerializer,
    responses={
        status.HTTP_200_OK: MagicLinkExchangeResponseSerializer,
        status.HTTP_400_BAD_REQUEST: ErrorDetailSerializer,
        status.HTTP_410_GONE: ErrorDetailSerializer,
    },
)
class MagicLinkExchangeView(GenericAPIView):
    """``POST /api/auth/magic-link/exchange/`` — token → JWT pair."""
    permission_classes = [AllowAny]
    throttle_classes = [MagicLinkExchangeRateThrottle]
    serializer_class = MagicLinkExchangeRequestSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payload = parse_magic_link_token(serializer.validated_data["token"])
        except MagicLinkTokenExpired:
            return Response({"detail": "token_expired"}, status=status.HTTP_410_GONE)
        except MagicLinkTokenInvalid:
            return Response({"detail": "token_invalid"}, status=status.HTTP_400_BAD_REQUEST)

        user = exchange_magic_link(user_id=payload["user_id"])
        if user is None:
            # Could not resolve the user (deleted), or user is no longer
            # eligible (deactivated, email no longer confirmed). Surface
            # a single error shape so attackers cannot distinguish
            # "deleted" from "deactivated" via timing or wording.
            return Response({"detail": "token_invalid"}, status=status.HTTP_400_BAD_REQUEST)

        refresh = RefreshToken.for_user(user)
        return Response(
            {"access": str(refresh.access_token), "refresh": str(refresh)},
            status=status.HTTP_200_OK,
        )
