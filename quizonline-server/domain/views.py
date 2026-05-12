from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view, OpenApiParameter
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import get_object_or_404 as drf_get_object_or_404
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from config.tools import MyModelViewSet

from core.mailers.domain_invite import send_domain_invite_email
from core.mailers.domain_join import (
    send_join_request_created_email,
    send_join_request_approved_email,
    send_join_request_rejected_email,
)
from .decision_token import (
    DecisionTokenExpired,
    DecisionTokenInvalid,
    parse_decision_token,
)
from .invite_token import (
    InviteTokenExpired,
    InviteTokenInvalid,
    parse_invite_token,
)
from .models import Domain, DomainJoinRequest, JoinPolicy
from .permissions import CanApproveJoinRequest, IsDomainOwnerOrManager
from .serializers import (
    DomainReadSerializer,
    DomainWriteSerializer,
    DomainPartialSerializer,
    DomainDetailSerializer,
    DomainMemberRoleSerializer,
    DomainJoinRequestReadSerializer,
    DomainJoinRequestRejectSerializer,
    DomainJoinRequestDecideResponseSerializer,
    DomainInviteRequestSerializer,
    DomainInviteResultSerializer,
    DomainInviteStateSerializer,
    ModerationSummaryItemSerializer,
)
from .services import domains_with_pending_for_user, users_who_can_approve
from config.tools import ErrorDetailSerializer
from django.contrib.auth import get_user_model


@extend_schema_view(
    list=extend_schema(
        tags=["Domain"],
        summary="Lister les domaines accessibles",
        description=(
                "Retourne la liste des domaines visibles par l'utilisateur courant.\n\n"
                "- **Superuser / staff global** : voit tous les domaines\n"
                "- **Utilisateur normal** : voit uniquement les domaines dont il est `owner` ou membre de `staff`"
        ),
        responses={status.HTTP_200_OK: DomainReadSerializer(many=True)},
    ),
    retrieve=extend_schema(
        tags=["Domain"],
        summary="Récupérer un domaine",
        description=(
                "Retourne un domaine (par `domain_id`).\n\n"
                "⚠️ Si l'utilisateur n'a pas accès au domaine, l'API renvoie généralement **404** "
                "(car `get_queryset()` ne retourne pas l'objet)."
        ),
        parameters=[
            OpenApiParameter(
                name="domain_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
                description="Identifiant du domaine (correspond à `<int:domain_id>` dans l'URL).",
            ),
        ],
        responses={
            status.HTTP_200_OK: DomainReadSerializer,
            status.HTTP_404_NOT_FOUND: OpenApiResponse(description="Not found (domain non visible ou inexistant)."),
        },
    ),
    details=extend_schema(
        tags=["Domain"],
        summary="Récupérer un domaine avec détails",
        parameters=[
            OpenApiParameter(
                name="domain_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
                description="ID du domaine.",
            )
        ],
        responses={
            200: DomainDetailSerializer,
            404: OpenApiResponse(response=ErrorDetailSerializer, description="Not found"),
        },
    ),
    create=extend_schema(
        tags=["Domain"],
        summary="Créer un domaine",
        description=(
                "Crée un nouveau domaine.\n\n"
                "- `owner` est forcé au user courant (même si fourni dans le payload).\n"
                "- Le user courant est ajouté à `staff` automatiquement.\n"
                "- `allowed_languages` doit être un sous-ensemble de `settings.LANGUAGES`."
        ),
        request=DomainWriteSerializer,
        responses={
            status.HTTP_201_CREATED: DomainReadSerializer,
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(description="Validation error."),
            status.HTTP_401_UNAUTHORIZED: OpenApiResponse(description="Authentication required."),
        },
    ),
    update=extend_schema(
        tags=["Domain"],
        summary="Mettre à jour un domaine",
        description=(
                "Met à jour un domaine (PUT).\n\n"
                "- Réservé à : superuser / staff global / owner / staff du domaine.\n"
                "- `owner` est **read-only** (ne peut pas être modifié via l'API)."
        ),
        request=DomainWriteSerializer,
        parameters=[
            OpenApiParameter(
                name="domain_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
                description="Identifiant du domaine (correspond à `<int:domain_id>` dans l'URL).",
            ),
        ],
        responses={
            status.HTTP_200_OK: DomainReadSerializer,
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(description="Validation error."),
            status.HTTP_401_UNAUTHORIZED: OpenApiResponse(description="Authentication required."),
            status.HTTP_403_FORBIDDEN: OpenApiResponse(description="Forbidden."),
            status.HTTP_404_NOT_FOUND: OpenApiResponse(description="Not found (domain non visible ou inexistant)."),
        },
    ),
    partial_update=extend_schema(
        tags=["Domain"],
        summary="Modifier partiellement un domaine",
        description=(
                "Met à jour partiellement un domaine (PATCH).\n\n"
                "- Réservé à : superuser / staff global / owner / staff du domaine.\n"
                "- `owner` est **read-only** (ne peut pas être modifié via l'API)."
        ),
        request=DomainPartialSerializer,
        parameters=[
            OpenApiParameter(
                name="domain_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
                description="Identifiant du domaine (correspond à `<int:domain_id>` dans l'URL).",
            ),
        ],
        responses={
            status.HTTP_200_OK: DomainReadSerializer,
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(description="Validation error."),
            status.HTTP_401_UNAUTHORIZED: OpenApiResponse(description="Authentication required."),
            status.HTTP_403_FORBIDDEN: OpenApiResponse(description="Forbidden."),
            status.HTTP_404_NOT_FOUND: OpenApiResponse(description="Not found (domain non visible ou inexistant)."),
        },
    ),
    destroy=extend_schema(
        tags=["Domain"],
        summary="Supprimer un domaine",
        description=(
                "Supprime un domaine.\n\n"
                "- Réservé à : superuser / staff global / owner / staff du domaine.\n"
                "⚠️ La suppression peut échouer si le domaine est référencé ailleurs (FK en PROTECT côté modèles liés)."
        ),
        parameters=[
            OpenApiParameter(
                name="domain_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
                description="Identifiant du domaine (correspond à `<int:domain_id>` dans l'URL).",
            ),
        ],
        responses={
            status.HTTP_204_NO_CONTENT: OpenApiResponse(description="Deleted."),
            status.HTTP_401_UNAUTHORIZED: OpenApiResponse(description="Authentication required."),
            status.HTTP_403_FORBIDDEN: OpenApiResponse(description="Forbidden."),
            status.HTTP_404_NOT_FOUND: OpenApiResponse(description="Not found (domain non visible ou inexistant)."),
        },
    ),
)
class DomainViewSet(MyModelViewSet):
    ordering = ["id"]
    lookup_field = "pk"
    lookup_url_kwarg = "domain_id"

    def get_permissions(self):
        if self.action in ["list", "retrieve", "details"]:
            return [AllowAny()]
        if self.action == "available_for_linking":
            return [AllowAny()]
        if self.action in ("leave", "moderation_summary"):
            # User-scoped actions: any authenticated user may call them and
            # the action body does the data scoping itself.
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsDomainOwnerOrManager()]

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return DomainReadSerializer
        elif self.action == "details":
            return DomainDetailSerializer
        elif self.action == "partial_update":
            return DomainPartialSerializer
        return DomainWriteSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Domain.objects.none()

        qs = (
            Domain.objects.all()
            .annotate(
                subjects_count=Count("subjects", filter=Q(subjects__active=True), distinct=True),
                questions_count=Count("questions", filter=Q(questions__active=True), distinct=True),
            )
            .select_related("owner")
            .prefetch_related("managers", "members", "allowed_languages", "translations")
            .order_by("id")
        )
        user = self.request.user
        if not user or user.is_anonymous:
            return qs.filter(active=True)
        if user.is_superuser:
            return qs
        return qs.filter(Q(owner=user) | Q(managers=user) | Q(members=user)).distinct()

    def perform_create(self, serializer):
        domain = serializer.save(created_by=self.request.user, updated_by=self.request.user)
        if self.request.user and not self.request.user.is_anonymous:
            domain.managers.add(self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def create(self, request, *args, **kwargs):
        write_serializer = self.get_serializer(data=request.data)
        write_serializer.is_valid(raise_exception=True)
        self.perform_create(write_serializer)
        instance = write_serializer.instance

        read_data = DomainReadSerializer(instance, context=self.get_serializer_context()).data
        headers = self.get_success_headers({"id": instance.pk})
        return Response(read_data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        write_serializer = self.get_serializer(instance, data=request.data, partial=partial)
        write_serializer.is_valid(raise_exception=True)
        self.perform_update(write_serializer)
        instance.refresh_from_db()

        read_data = DomainReadSerializer(instance, context=self.get_serializer_context()).data
        return Response(read_data, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    @action(detail=True, methods=["get"], url_path="details")
    def details(self, request, *args, **kwargs):
        self._log_call(
            method_name="details",
            endpoint="GET /api/domain/{domain_id}/details/",
            input_expected="path domain_id, body vide",
            output="200 + DomainDetailSerializer | 404",
        )
        instance = self.get_object()
        serializer = self.get_serializer(instance, context=self.get_serializer_context())
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="available-for-linking")
    def available_for_linking(self, request, *args, **kwargs):
        # Only public domains surface in the discovery catalog. Private
        # domains are joinable only through an emailed invitation, so
        # they must never appear here.
        queryset = (
            Domain.objects.filter(active=True, public=True)
            .select_related("owner")
            .prefetch_related("managers", "members", "allowed_languages", "translations")
            .order_by("id")
        )
        # Support pagination when ?page= is provided; otherwise return flat list
        # for backwards compatibility with register/preferences dropdowns.
        if "page" in request.query_params:
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = DomainReadSerializer(page, many=True, context=self.get_serializer_context())
                return self.get_paginated_response(serializer.data)
        serializer = DomainReadSerializer(queryset, many=True, context=self.get_serializer_context())
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="member-role")
    def member_role(self, request, *args, **kwargs):
        domain = self.get_object()
        serializer = DomainMemberRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        user_model = get_user_model()
        target = user_model.objects.filter(pk=validated["user_id"]).first()
        if not target:
            raise ValidationError({"user_id": "User not found."})

        if not domain.members.filter(pk=target.pk).exists() and domain.owner_id != target.pk:
            raise ValidationError({"user_id": "User must be linked to this domain first."})

        requester = request.user
        is_superuser = bool(getattr(requester, "is_superuser", False))

        with transaction.atomic():
            # --- Intent A: scoped removal from this domain only ---
            # Never touches User.is_active. The serializer guarantees this
            # branch is exclusive (no is_active / is_domain_manager combined).
            if validated.get("remove_member"):
                self._authorize_remove_member(
                    requester=requester, target=target, domain=domain, is_superuser=is_superuser
                )
                domain.managers.remove(target)
                domain.members.remove(target)
                target.refresh_from_db(fields=["is_active", "is_staff"])
                return Response(
                    {
                        "id": target.id,
                        "username": target.username,
                        "is_active": target.is_active,
                        "is_staff": target.is_staff,
                        "is_domain_manager": False,
                        "is_member": False,
                    },
                    status=status.HTTP_200_OK,
                )

            update_fields: list[str] = []

            # --- Intent B: global account flag, strict guards ---
            if "is_active" in validated:
                self._authorize_is_active_change(
                    requester=requester, target=target, domain=domain, is_superuser=is_superuser
                )
                target.is_active = validated["is_active"]
                update_fields.append("is_active")

            # --- Intent C: domain-scoped manager flag ---
            if "is_domain_manager" in validated:
                # Promoting / demoting domain managers is owner-only (or
                # superuser). Peer managers cannot rearrange the leadership
                # of a domain — only the owner has that authority. This
                # avoids manager-coups and matches the same trust model as
                # ``Domain.owner`` itself.
                if not is_superuser and domain.owner_id != requester.id:
                    raise PermissionDenied(
                        "Seul le propriétaire du domaine peut modifier les rôles."
                    )
                make_manager = validated["is_domain_manager"]
                if make_manager:
                    domain.managers.add(target)
                    domain.members.add(target)
                    if is_superuser and not target.is_staff:
                        target.is_staff = True
                        update_fields.append("is_staff")
                    # Any pending join request gets flipped to approved with
                    # the pushing manager as the decider. Idempotent: zero
                    # affected rows when there is no pending request.
                    from domain.services import flip_pending_to_approved
                    flip_pending_to_approved(domain, target, by=requester)
                else:
                    domain.managers.remove(target)
                    if (
                        is_superuser
                        and target.is_staff
                        and not target.is_superuser
                        and not target.managed_domains.exclude(pk=domain.pk).exists()
                    ):
                        target.is_staff = False
                        update_fields.append("is_staff")

            if update_fields:
                target.save(update_fields=update_fields)

        if "is_domain_manager" in validated:
            is_domain_manager = validated["is_domain_manager"]
        else:
            is_domain_manager = domain.managers.filter(pk=target.pk).exists()
        return Response(
            {
                "id": target.id,
                "username": target.username,
                "is_active": target.is_active,
                "is_staff": target.is_staff,
                "is_domain_manager": is_domain_manager,
            },
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def _authorize_is_active_change(*, requester, target, domain, is_superuser: bool) -> None:
        """
        Toggling ``User.is_active`` is a global operation: it locks/unlocks the
        account on the entire platform, not just on this domain. Allow only
        when the requester is a superuser, or when **all** of these hold:

        - the target is not a superuser;
        - the target is not the owner of this domain;
        - the target is not another manager of this domain (managers cannot
          deactivate their peers);
        - the target is not the requester themselves (no self-lockout);
        - the target is **exclusively** in this domain (no other membership,
          ownership, or manager role on any other domain).

        The last rule is the core of the model: a manager only has global
        authority over a user if they de facto control that user's whole
        footprint on the platform.
        """
        if is_superuser:
            return
        if getattr(target, "is_superuser", False):
            raise PermissionDenied("Vous ne pouvez pas désactiver un superuser.")
        if target.pk == domain.owner_id:
            raise PermissionDenied("Vous ne pouvez pas désactiver le owner du domaine.")
        if target.pk == requester.pk:
            raise PermissionDenied("Vous ne pouvez pas vous désactiver vous-même.")
        if domain.managers.filter(pk=target.pk).exists():
            raise PermissionDenied("Vous ne pouvez pas désactiver un autre manager du domaine.")

        other_link = (
            Domain.objects
            .filter(Q(members=target) | Q(owner=target) | Q(managers=target))
            .exclude(pk=domain.pk)
            .exists()
        )
        if other_link:
            raise PermissionDenied(
                "L'utilisateur appartient à d'autres domaines — seul un superuser peut "
                "désactiver son compte globalement."
            )

    @staticmethod
    def _authorize_remove_member(*, requester, target, domain, is_superuser: bool) -> None:
        """
        Removing a user from a domain is scoped, but we still refuse a few
        nonsensical or hostile cases. Superusers bypass the peer/owner checks
        because they may legitimately need to clean up.
        """
        if target.pk == domain.owner_id:
            raise PermissionDenied("Le owner d'un domaine ne peut pas en être retiré.")
        if is_superuser:
            return
        if target.pk == requester.pk:
            raise PermissionDenied("Vous ne pouvez pas vous retirer vous-même du domaine.")
        if domain.managers.filter(pk=target.pk).exists():
            raise PermissionDenied("Un manager ne peut pas en retirer un autre.")

    @extend_schema(
        tags=["Domain"],
        summary="Tableau de bord modération : domaines avec demandes en attente",
        description=(
            "Pour l'utilisateur connecté, renvoie la liste des domaines qu'il "
            "peut modérer et qui ont au moins une demande d'adhésion en "
            "attente. Trié par nombre de demandes décroissant.\n\n"
            "Endpoint volontairement léger (aucune action), pensé pour une "
            "tuile d'accueil."
        ),
        responses={
            status.HTTP_200_OK: ModerationSummaryItemSerializer(many=True),
        },
    )
    @action(
        detail=False,
        methods=["get"],
        url_path="moderation-summary",
        permission_classes=[IsAuthenticated],
        # Explicitly disable pagination on this action: we return a small
        # list (one item per moderable domain with pending requests) and
        # never need pagination. Without this, the viewset's default
        # pagination class would prompt drf-spectacular to advertise a
        # ``Paginated...`` response shape that diverges from what we
        # actually return.
        pagination_class=None,
    )
    def moderation_summary(self, request, *args, **kwargs):
        return Response(domains_with_pending_for_user(request.user))

    @extend_schema(
        tags=["Domain"],
        summary="Inviter un ou plusieurs utilisateurs par e-mail",
        description=(
            "Envoie une invitation signée à chaque adresse de la liste. Le "
            "destinataire suivra un lien qui pointe sur la page d'acceptation "
            "frontend ; aucun objet d'invitation n'est créé côté DB (le token "
            "est l'invitation).\n\n"
            "Accessible aux owners et aux managers du domaine."
        ),
        request=DomainInviteRequestSerializer,
        responses={status.HTTP_200_OK: DomainInviteResultSerializer(many=True)},
    )
    @action(detail=True, methods=["post"], url_path="invite", pagination_class=None)
    def invite(self, request, *args, **kwargs):
        domain = self.get_object()
        serializer = DomainInviteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        emails = serializer.validated_data["emails"]
        language = serializer.validated_data["language"]

        User = get_user_model()
        results: list[dict] = []
        seen_lower: set[str] = set()

        for raw_email in emails:
            email = (raw_email or "").strip().lower()
            if not email or email in seen_lower:
                # The serializer already filtered out malformed addresses, so
                # we only need to deduplicate within the same request.
                continue
            seen_lower.add(email)

            existing = User.objects.filter(email__iexact=email).first()
            if existing and domain.members.filter(pk=existing.pk).exists():
                results.append({"email": email, "status": "already_member"})
                continue

            try:
                send_domain_invite_email(
                    email=email, domain=domain, inviter=request.user, language=language,
                )
                results.append({"email": email, "status": "sent"})
            except Exception:  # pragma: no cover — defensive
                results.append({"email": email, "status": "invalid"})

        return Response(results, status=status.HTTP_200_OK)

    @extend_schema(
        tags=["Domain"],
        summary="Quitter le domaine (action volontaire de l'utilisateur)",
        description=(
            "L'utilisateur connecté se retire du domaine. Refuse :\n\n"
            "- si l'utilisateur est le owner (il doit d'abord transférer la propriété) ;\n"
            "- si l'utilisateur n'est pas membre du domaine.\n\n"
            "Tout statut de manager est aussi retiré. Idempotent au niveau\n"
            "du M2M (`remove` sur un non-membre est un no-op)."
        ),
        request=None,
        responses={
            status.HTTP_204_NO_CONTENT: OpenApiResponse(description="Quitté."),
            status.HTTP_403_FORBIDDEN: ErrorDetailSerializer,
            status.HTTP_409_CONFLICT: ErrorDetailSerializer,
        },
    )
    @action(detail=True, methods=["post"], url_path="leave", permission_classes=[IsAuthenticated])
    def leave(self, request, *args, **kwargs):
        domain = self.get_object()
        user = request.user
        if domain.owner_id == user.id:
            return Response(
                {"detail": "owner_cannot_leave"},
                status=status.HTTP_409_CONFLICT,
            )
        if not domain.members.filter(pk=user.pk).exists():
            return Response(
                {"detail": "not_a_member"},
                status=status.HTTP_409_CONFLICT,
            )
        with transaction.atomic():
            domain.managers.remove(user)
            domain.members.remove(user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class DomainJoinRequestViewSet(viewsets.GenericViewSet):
    """
    Nested under /api/domain/{domain_id}/join-request/.
    """
    serializer_class = DomainJoinRequestReadSerializer
    queryset = DomainJoinRequest.objects.all()
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"
    lookup_url_kwarg = "req_id"

    def _get_domain(self):
        return drf_get_object_or_404(
            Domain.objects.filter(active=True),
            pk=self.kwargs["domain_id"],
        )

    def _check_can_approve(self, domain):
        perm = CanApproveJoinRequest()
        if not perm.has_object_permission(self.request, self, domain):
            raise PermissionDenied("cannot_approve_join_requests")

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return DomainJoinRequest.objects.none()
        qs = DomainJoinRequest.objects.filter(domain_id=self.kwargs["domain_id"])
        status_filter = self.request.query_params.get("status")
        if status_filter:
            valid_statuses = {code for code, _ in DomainJoinRequest.STATUS_CHOICES}
            if status_filter not in valid_statuses:
                raise ValidationError({"status": "invalid"})
            qs = qs.filter(status=status_filter)
        return qs.select_related("user", "decided_by", "domain").order_by("-created_at")

    def list(self, request, *args, **kwargs):
        domain = self._get_domain()
        self._check_can_approve(domain)
        qs = self.get_queryset()
        return Response(self.get_serializer(qs, many=True).data)

    def retrieve(self, request, *args, **kwargs):
        domain = self._get_domain()
        self._check_can_approve(domain)
        obj = drf_get_object_or_404(self.get_queryset(), pk=self.kwargs["req_id"])
        return Response(self.get_serializer(obj).data)

    def create(self, request, *args, **kwargs):
        domain = self._get_domain()
        user = request.user

        if domain.owner_id == user.id:
            return Response(
                {"detail": "already_owner"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if domain.members.filter(pk=user.pk).exists():
            return Response(
                {"detail": "already_member"},
                status=status.HTTP_409_CONFLICT,
            )
        # Private domains accept only invitation-based access. A
        # spontaneous join-request is refused even if the caller somehow
        # learned the domain id (e.g., from another user). Note we 404
        # rather than 403 to keep the existence of the domain undisclosed
        # to outsiders, matching the discovery filter.
        if not domain.public:
            return Response(
                {"detail": "not_found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if domain.join_policy == JoinPolicy.AUTO:
            domain.members.add(user)
            return Response(
                {"status": "approved", "request": None},
                status=status.HTTP_200_OK,
            )

        from django.db import IntegrityError

        with transaction.atomic():
            existing = (
                DomainJoinRequest.objects
                .select_for_update()
                .filter(
                    domain=domain,
                    user=user,
                    status=DomainJoinRequest.STATUS_PENDING,
                )
                .first()
            )
            if existing:
                return Response(
                    {
                        "status": "pending",
                        "request": DomainJoinRequestReadSerializer(existing).data,
                    },
                    status=status.HTTP_200_OK,
                )

            # Resolve approvers eagerly (inside the transaction) so the email
            # is sent to the people who could approve at the time of creation.
            # Closure captures `approvers` by value, not `domain` by reference.
            approvers = users_who_can_approve(domain)

            try:
                # Nested atomic so that an IntegrityError on this single insert
                # rolls back only the create, not the parent transaction. This
                # is the documented Django pattern for catching IntegrityError
                # inside transaction.atomic.
                with transaction.atomic():
                    join_request = DomainJoinRequest.objects.create(
                        domain=domain,
                        user=user,
                        status=DomainJoinRequest.STATUS_PENDING,
                    )
            except IntegrityError:
                # Race: another POST inserted a pending row between our SELECT
                # and our create. The partial unique constraint fired. Re-fetch
                # the now-existing row and return it idempotently.
                existing = DomainJoinRequest.objects.get(
                    domain=domain,
                    user=user,
                    status=DomainJoinRequest.STATUS_PENDING,
                )
                return Response(
                    {
                        "status": "pending",
                        "request": DomainJoinRequestReadSerializer(existing).data,
                    },
                    status=status.HTTP_200_OK,
                )

            transaction.on_commit(
                lambda: send_join_request_created_email(
                    join_request=join_request,
                    recipients=approvers,
                )
            )

        return Response(
            {
                "status": "pending",
                "request": DomainJoinRequestReadSerializer(join_request).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, *args, **kwargs):
        domain = self._get_domain()
        self._check_can_approve(domain)
        with transaction.atomic():
            join_request = drf_get_object_or_404(
                DomainJoinRequest.objects.select_for_update(),
                pk=self.kwargs["req_id"],
                domain=domain,
            )
            if join_request.status != DomainJoinRequest.STATUS_PENDING:
                return Response(
                    {"detail": "not_pending"},
                    status=status.HTTP_409_CONFLICT,
                )
            join_request.status = DomainJoinRequest.STATUS_APPROVED
            join_request.decided_by = request.user
            join_request.decided_at = timezone.now()
            join_request.save(update_fields=["status", "decided_by", "decided_at", "updated_at"])
            domain.members.add(join_request.user)
            transaction.on_commit(
                lambda jr=join_request: send_join_request_approved_email(join_request=jr)
            )
        return Response(self.get_serializer(join_request).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, *args, **kwargs):
        domain = self._get_domain()
        self._check_can_approve(domain)
        serializer = DomainJoinRequestRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get("reason", "")
        with transaction.atomic():
            join_request = drf_get_object_or_404(
                DomainJoinRequest.objects.select_for_update(),
                pk=self.kwargs["req_id"],
                domain=domain,
            )
            if join_request.status != DomainJoinRequest.STATUS_PENDING:
                return Response(
                    {"detail": "not_pending"},
                    status=status.HTTP_409_CONFLICT,
                )
            join_request.status = DomainJoinRequest.STATUS_REJECTED
            join_request.decided_by = request.user
            join_request.decided_at = timezone.now()
            join_request.reject_reason = reason
            join_request.save(update_fields=["status", "decided_by", "decided_at", "reject_reason", "updated_at"])
            transaction.on_commit(
                lambda jr=join_request: send_join_request_rejected_email(join_request=jr)
            )
        return Response(self.get_serializer(join_request).data)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, *args, **kwargs):
        """
        Cancel a pending join request.

        Two intentional design choices that should NOT be "fixed":

        1. No `transaction.atomic` / `select_for_update`. Cancellation is a
           monotonic single-column write (pending → cancelled) with no side
           effects. Two concurrent cancels collapse to the same terminal
           state — idempotent at the row level. An approve-vs-cancel race
           is last-write-wins by design (the HTTP client that lost the race
           observes the final state on next fetch).

        2. The approver gate (`_check_can_approve`) is intentionally NOT
           reused here. Cancellation is a requester-only action: only the
           user who created the request (or a superuser) can cancel it.
           The domain owner can approve and reject, but cannot cancel
           someone else's request — that's a different concept.
        """
        domain = self._get_domain()
        join_request = drf_get_object_or_404(
            DomainJoinRequest.objects.all(),
            pk=self.kwargs["req_id"],
            domain=domain,
        )
        is_superuser = bool(getattr(request.user, "is_superuser", False))
        if join_request.user_id != request.user.id and not is_superuser:
            raise PermissionDenied("only_requester_can_cancel")
        if join_request.status != DomainJoinRequest.STATUS_PENDING:
            return Response(
                {"detail": "not_pending"},
                status=status.HTTP_409_CONFLICT,
            )
        join_request.status = DomainJoinRequest.STATUS_CANCELLED
        join_request.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(join_request).data)


@extend_schema_view(
    get=extend_schema(
        tags=["Domain"],
        summary="Décoder un token de décision (depuis un lien email)",
        description=(
            "Décode le token signé envoyé par mail, vérifie que l'utilisateur "
            "connecté en est bien le destinataire, et renvoie l'état courant de "
            "la demande pour que le frontend puisse afficher un récapitulatif "
            "avant exécution.\n\n"
            "Aucune écriture n'est faite par ce GET — il sert uniquement à "
            "alimenter la page de confirmation."
        ),
        responses={
            status.HTTP_200_OK: DomainJoinRequestDecideResponseSerializer,
            status.HTTP_400_BAD_REQUEST: ErrorDetailSerializer,
            status.HTTP_403_FORBIDDEN: ErrorDetailSerializer,
            status.HTTP_404_NOT_FOUND: ErrorDetailSerializer,
            status.HTTP_410_GONE: ErrorDetailSerializer,
        },
    ),
    post=extend_schema(
        tags=["Domain"],
        summary="Exécuter la décision portée par un token de mail",
        description=(
            "Exécute l'action (`approve` ou `reject`) encodée dans le token. "
            "Le clic depuis le mail compte comme une décision explicite : si la "
            "demande avait déjà été tranchée (côté app ou autre mail), la "
            "nouvelle décision écrase l'ancienne (last-decision-wins), avec un "
            "renvoi de mail à l'utilisateur concerné."
        ),
        request=None,
        responses={
            status.HTTP_200_OK: DomainJoinRequestDecideResponseSerializer,
            status.HTTP_400_BAD_REQUEST: ErrorDetailSerializer,
            status.HTTP_403_FORBIDDEN: ErrorDetailSerializer,
            status.HTTP_404_NOT_FOUND: ErrorDetailSerializer,
            status.HTTP_410_GONE: ErrorDetailSerializer,
        },
    ),
)
class DomainJoinRequestDecideView(APIView):
    """
    Public landing endpoint for the email accept/reject links.

    The token is the only thing that bridges an opaque inbox to a specific
    pending request: it carries the request id, the recipient user id and
    the requested action, all signed and time-stamped. We *also* require a
    DRF auth session (``IsAuthenticated``) so that a forwarded mail cannot
    be acted on by an attacker who never logged in to the platform.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, token: str):
        parsed = self._parse(token)
        if isinstance(parsed, Response):
            return parsed
        return self._build_state_response(parsed, request.user)

    def post(self, request, token: str):
        parsed = self._parse(token)
        if isinstance(parsed, Response):
            return parsed
        return self._execute(parsed, request.user)

    @staticmethod
    def _parse(token: str):
        try:
            return parse_decision_token(token)
        except DecisionTokenExpired:
            return Response({"detail": "token_expired"}, status=status.HTTP_410_GONE)
        except DecisionTokenInvalid:
            return Response({"detail": "token_invalid"}, status=status.HTTP_400_BAD_REQUEST)

    @staticmethod
    def _authorize(user, payload, join_request) -> Response | None:
        if user.id != payload["recipient_user_id"]:
            return Response(
                {"detail": "token_recipient_mismatch"},
                status=status.HTTP_403_FORBIDDEN,
            )
        perm = CanApproveJoinRequest()
        # ``has_object_permission`` is called with the bound domain so that
        # owner / manager / superuser checks honour the *current* state of
        # the domain — a moderator who has been removed since the mail was
        # sent loses access here.
        fake_request = type("_R", (), {"user": user})()
        if not perm.has_object_permission(fake_request, None, join_request.domain):
            return Response(
                {"detail": "cannot_approve_anymore"},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def _build_state_response(self, payload, user) -> Response:
        join_request = drf_get_object_or_404(
            DomainJoinRequest.objects.select_related("user", "decided_by", "domain"),
            pk=payload["request_id"],
        )
        denial = self._authorize(user, payload, join_request)
        if denial is not None:
            return denial
        return Response({
            "action": payload["action"],
            "was_already_decided": join_request.status != DomainJoinRequest.STATUS_PENDING,
            "request": DomainJoinRequestReadSerializer(join_request).data,
        })

    def _execute(self, payload, user) -> Response:
        action_kind = payload["action"]
        now = timezone.now()
        with transaction.atomic():
            join_request = drf_get_object_or_404(
                DomainJoinRequest.objects.select_for_update().select_related("user", "decided_by", "domain"),
                pk=payload["request_id"],
            )
            denial = self._authorize(user, payload, join_request)
            if denial is not None:
                return denial

            previous_status = join_request.status
            was_already_decided = previous_status != DomainJoinRequest.STATUS_PENDING

            if action_kind == "approve":
                join_request.status = DomainJoinRequest.STATUS_APPROVED
                join_request.decided_by = user
                join_request.decided_at = now
                # Approving from mail clears any prior reject reason so the
                # row stays internally consistent (status APPROVED + empty
                # reason).
                join_request.reject_reason = ""
                join_request.save(update_fields=[
                    "status", "decided_by", "decided_at", "reject_reason", "updated_at",
                ])
                join_request.domain.members.add(join_request.user)
                transaction.on_commit(
                    lambda jr=join_request: send_join_request_approved_email(join_request=jr)
                )
            else:  # reject
                join_request.status = DomainJoinRequest.STATUS_REJECTED
                join_request.decided_by = user
                join_request.decided_at = now
                # No reason captured from a one-click mail link.
                join_request.reject_reason = ""
                join_request.save(update_fields=[
                    "status", "decided_by", "decided_at", "reject_reason", "updated_at",
                ])
                # Last-decision-wins: if a previous approve had put the user
                # in the domain, take them back out.
                if previous_status == DomainJoinRequest.STATUS_APPROVED:
                    join_request.domain.members.remove(join_request.user)
                transaction.on_commit(
                    lambda jr=join_request: send_join_request_rejected_email(join_request=jr)
                )

        return Response({
            "action": action_kind,
            "was_already_decided": was_already_decided,
            "request": DomainJoinRequestReadSerializer(join_request).data,
        })


@extend_schema_view(
    get=extend_schema(
        tags=["Domain"],
        summary="Décoder un token d'invitation",
        description=(
            "Décode le lien d'invitation reçu par mail et renvoie l'état du "
            "destinataire vis-à-vis du domaine : prêt à accepter, doit se "
            "connecter, doit s'inscrire, etc.\n\n"
            "Endpoint public : la page d'acceptation est volontairement "
            "accessible avant l'authentification pour pouvoir orienter le "
            "visiteur vers la bonne action (login / signup)."
        ),
        responses={
            status.HTTP_200_OK: DomainInviteStateSerializer,
            status.HTTP_400_BAD_REQUEST: ErrorDetailSerializer,
            status.HTTP_404_NOT_FOUND: ErrorDetailSerializer,
            status.HTTP_410_GONE: ErrorDetailSerializer,
        },
    ),
    post=extend_schema(
        tags=["Domain"],
        summary="Accepter l'invitation (utilisateur authentifié)",
        description=(
            "Ajoute l'utilisateur connecté aux membres du domaine si son "
            "adresse e-mail correspond à celle encodée dans le token. Sinon "
            "renvoie 403 ``wrong_account`` — l'invitation reste valide pour "
            "le bon compte jusqu'à expiration."
        ),
        request=None,
        responses={
            status.HTTP_200_OK: DomainInviteStateSerializer,
            status.HTTP_400_BAD_REQUEST: ErrorDetailSerializer,
            status.HTTP_401_UNAUTHORIZED: ErrorDetailSerializer,
            status.HTTP_403_FORBIDDEN: ErrorDetailSerializer,
            status.HTTP_404_NOT_FOUND: ErrorDetailSerializer,
            status.HTTP_410_GONE: ErrorDetailSerializer,
        },
    ),
)
class DomainInviteAcceptView(APIView):
    """Decode an invitation token and (POST) materialise membership."""

    # Public GET so the landing page can render without forcing a login
    # first; POST checks ``request.user.is_authenticated`` itself so
    # anonymous POSTs return the ``signup_required`` state instead of a
    # blanket 401.
    permission_classes = []

    def get(self, request, token: str):
        return self._respond(request, token, do_accept=False)

    def post(self, request, token: str):
        return self._respond(request, token, do_accept=True)

    def _respond(self, request, token: str, *, do_accept: bool) -> Response:
        parsed = self._parse(token)
        if isinstance(parsed, Response):
            return parsed
        domain = drf_get_object_or_404(Domain.objects.filter(active=True), pk=parsed["domain_id"])
        invited_email = parsed["email"]

        User = get_user_model()
        inviter = User.objects.filter(pk=parsed["inviter_id"]).first()
        inviter_username = inviter.username if inviter else ""

        domain_name = domain.safe_translation_getter("name", any_language=True) or f"Domain#{domain.pk}"

        base_payload = {
            "domain_id": domain.id,
            "domain_name": domain_name,
            "inviter_username": inviter_username,
            "invited_email": invited_email,
        }

        user = getattr(request, "user", None)
        is_auth = bool(user and user.is_authenticated)

        if is_auth:
            if (user.email or "").lower() != invited_email:
                return Response(
                    {**base_payload, "state": "wrong_account"},
                    status=status.HTTP_403_FORBIDDEN if do_accept else status.HTTP_200_OK,
                )
            if domain.members.filter(pk=user.pk).exists():
                return Response({**base_payload, "state": "already_member"})

            if do_accept:
                with transaction.atomic():
                    domain.members.add(user)
                return Response({**base_payload, "state": "accepted"})
            return Response({**base_payload, "state": "ready_to_accept"})

        # Anonymous: route based on whether an account exists for that mail.
        existing = User.objects.filter(email__iexact=invited_email).first()
        if existing:
            return Response({**base_payload, "state": "login_required"})
        return Response({**base_payload, "state": "signup_required"})

    @staticmethod
    def _parse(token: str):
        try:
            return parse_invite_token(token)
        except InviteTokenExpired:
            return Response({"detail": "token_expired"}, status=status.HTTP_410_GONE)
        except InviteTokenInvalid:
            return Response({"detail": "token_invalid"}, status=status.HTTP_400_BAD_REQUEST)
