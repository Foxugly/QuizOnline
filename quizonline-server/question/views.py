import json
import logging

from django.http import HttpResponse, QueryDict
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import (
    extend_schema,
    extend_schema_serializer,
    extend_schema_view,
    OpenApiParameter,
    OpenApiResponse,
    OpenApiTypes,
)
from rest_framework import status, serializers
from rest_framework.decorators import action
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from config.tools import ErrorDetailSerializer
from config.tools import MyModelViewSet
from config.serializers import (
    LocalizedAnswerOptionTranslationSerializer,
    LocalizedQuestionTranslationSerializer,
    LocalizedTranslationsDictField,
)

from .models import Question
from .permissions import IsQuestionDomainManager
from .querysets import accessible_question_queryset
from .structured_export import export_questions
from .structured_import import import_questions, StructuredImportError, StructuredImportPermissionError
from .serializers import QuestionReadSerializer, QuestionWriteSerializer

logger = logging.getLogger(__name__)


class QuestionListPagination(PageNumberPagination):
    page_size_query_param = "page_size"
    max_page_size = 100


@extend_schema_serializer(component_name="QuestionAnswerOptionWritePayload")
class QuestionAnswerOptionWritePayloadSerializer(serializers.Serializer):
    """OpenAPI doc serializer for one answer option in the question
    write payload.

    Phase 3.5: ``translations`` (the legacy per-language
    ``content`` blob) is now optional — the answer's visible
    content has migrated to polymorphic ``Block`` rows, so the
    write payload only needs to carry the structural metadata
    (``is_correct`` / ``sort_order``) and an optional ``id`` to
    pin the row identity across an update. The translations
    field is kept on the schema for backwards compatibility with
    pre-3.5 frontend builds — when supplied, the backend silently
    drops it.
    """
    id = serializers.IntegerField(required=False)
    is_correct = serializers.BooleanField(required=False)
    sort_order = serializers.IntegerField(required=False, min_value=0)
    translations = LocalizedTranslationsDictField(
        value_serializer=LocalizedAnswerOptionTranslationSerializer,
        write_only=True,
        required=False,
    )


@extend_schema_serializer(component_name="QuestionWritePayload")
class QuestionWritePayloadSerializer(serializers.Serializer):
    domain = serializers.IntegerField(required=True)
    translations = LocalizedTranslationsDictField(
        value_serializer=LocalizedQuestionTranslationSerializer,
        write_only=True,
        required=True,
        help_text="Object keyed by language code.",
    )
    allow_multiple_correct = serializers.BooleanField(required=False)
    active = serializers.BooleanField(required=False)
    is_mode_practice = serializers.BooleanField(required=False)
    is_mode_exam = serializers.BooleanField(required=False)
    subject_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
    )
    answer_options = QuestionAnswerOptionWritePayloadSerializer(
        many=True,
        write_only=True,
        required=False,
    )


@extend_schema_serializer(component_name="QuestionPartialWritePayload")
class QuestionPartialWritePayloadSerializer(QuestionWritePayloadSerializer):
    domain = serializers.IntegerField(required=False)
    translations = LocalizedTranslationsDictField(
        value_serializer=LocalizedQuestionTranslationSerializer,
        write_only=True,
        required=False,
        help_text="Object keyed by language code.",
    )


class QuestionPartialRequestSerializer(QuestionWriteSerializer):
    domain = serializers.PrimaryKeyRelatedField(queryset=Question._meta.get_field("domain").remote_field.model.objects.all(), required=False)


@extend_schema_view(
    list=extend_schema(
        tags=["Question"],
        summary="Lister les questions",
        description=(
                "Liste paginée des questions.\n\n"
                "Supporte :\n"
                "- `search` (filtre title__icontains)\n"
        ),
        parameters=[
            OpenApiParameter(
                name="search",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Recherche simple (title__icontains).",
            ),
            OpenApiParameter(
                name="subject_ids",
                type={"type": "array", "items": {"type": "integer"}},
                location=OpenApiParameter.QUERY,
                required=False,
                style="form",
                explode=False,
                description="Liste d'IDs de sujets pour filtrer les questions.",
            ),
        ],
        responses={
            200: QuestionReadSerializer(many=True),
            403: OpenApiResponse(response=ErrorDetailSerializer, description="Forbidden (admin only)"),
        },
    ),
    retrieve=extend_schema(
        tags=["Question"],
        summary="Récupérer une question",
        parameters=[
            OpenApiParameter(
                name="question_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
                description="ID de la question (question_id).",
            )
        ],
        responses={
            200: QuestionReadSerializer,
            404: OpenApiResponse(response=ErrorDetailSerializer, description="Not found"),
            403: OpenApiResponse(response=ErrorDetailSerializer, description="Forbidden (admin only)"),
        },
    ),
    create=extend_schema(
        tags=["Question"],
        summary="Créer une question (JSON)",
        description=(
                "Crée une question.\n\n"
                "Payload : JSON.\n"
                "- `subject_ids`: liste d'IDs\n"
                "- `answer_options`: liste\n\n"
                "Les médias (image / vidéo / fichier) sont désormais "
                "stockés sous forme de content blocks via `/api/block/`.\n"
        ),
        request=QuestionWritePayloadSerializer,
        responses={
            201: QuestionReadSerializer,
            400: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Validation error"),
            403: OpenApiResponse(response=ErrorDetailSerializer, description="Forbidden (admin only)"),
        },
    ),
    update=extend_schema(
        tags=["Question"],
        summary="Mettre à jour une question (PUT)",
        parameters=[
            OpenApiParameter(
                name="question_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
                description="ID de la question (question_id).",
            )
        ],
        request=QuestionWritePayloadSerializer,
        responses={
            200: QuestionReadSerializer,
            400: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Validation error"),
            404: OpenApiResponse(response=ErrorDetailSerializer, description="Not found"),
            403: OpenApiResponse(response=ErrorDetailSerializer, description="Forbidden (admin only)"),
        },
    ),
    partial_update=extend_schema(
        tags=["Question"],
        summary="Mettre à jour une question (PATCH)",
        parameters=[
            OpenApiParameter(
                name="question_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
                description="ID de la question (question_id).",
            )
        ],
        request=QuestionPartialWritePayloadSerializer,
        responses={
            200: QuestionReadSerializer,
            400: OpenApiResponse(response=OpenApiTypes.OBJECT, description="Validation error"),
            404: OpenApiResponse(response=ErrorDetailSerializer, description="Not found"),
            403: OpenApiResponse(response=ErrorDetailSerializer, description="Forbidden (admin only)"),
        },
    ),
    destroy=extend_schema(
        tags=["Question"],
        summary="Supprimer une question",
        parameters=[
            OpenApiParameter(
                name="question_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
                description="ID de la question (question_id).",
            )
        ],
        responses={
            204: OpenApiResponse(description="No Content"),
            404: OpenApiResponse(response=ErrorDetailSerializer, description="Not found"),
            403: OpenApiResponse(response=ErrorDetailSerializer, description="Forbidden (admin only)"),
        },
    ),
)
class QuestionViewSet(MyModelViewSet):
    queryset = Question.objects.none()
    permission_classes = [IsQuestionDomainManager]
    pagination_class = QuestionListPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["domain", "active", "is_mode_practice", "is_mode_exam"]
    lookup_field = "pk"
    lookup_url_kwarg = "question_id"

    def get_parsers(self):
        action = getattr(self, "action", None)
        if action in ["create","update"]:
            return [JSONParser()]
        return super().get_parsers()

    def get_queryset(self):
        return accessible_question_queryset(getattr(self.request, "user", None))

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        user = getattr(self.request, "user", None)
        ctx["show_correct"] = bool(
            user
            and user.is_authenticated
        )
        return ctx

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return QuestionReadSerializer
        if self.action == "partial_update":
            return QuestionPartialRequestSerializer
        return QuestionWriteSerializer

    # ==========================================================
    # Permissions (explicites même si redondantes)
    # ==========================================================

    def get_permissions(self):
        return [IsQuestionDomainManager()]

    # ==========================================================
    # coercion JSON fields
    # ==========================================================
    def _coerce_json_fields(self, data):
        if isinstance(data, QueryDict):
            mutable = {}
            for key in data.keys():
                if key == "subject_ids":
                    raw = data.getlist(key)
                    ids: list[int] = []
                    for item in raw:
                        if not item:
                            continue
                        parts = [p.strip() for p in str(item).split(",") if p.strip()]
                        for p in parts:
                            ids.append(int(p))
                    mutable[key] = ids
                else:
                    mutable[key] = data.get(key)
            return mutable
        return dict(data)
    # ==========================================================
    # CRUD implicite : surcharges
    # ==========================================================
    def list(self, request, *args, **kwargs):
        self._log_call(
            method_name="list",
            endpoint="GET /api/question/",
            input_expected="query params (search?, title?, description?), body vide",
            output="200 + [QuestionSerializer] (paginé)",
        )
        qs = self.filter_queryset(self.get_queryset())
        search = (request.query_params.get("search") or "")[:200]
        subject_ids_raw: list[str] = []
        for value in request.query_params.getlist("subject_ids"):
            if not str(value).strip():
                continue
            subject_ids_raw.extend(part.strip() for part in str(value).split(",") if part.strip())
        if not subject_ids_raw:
            csv_subjects = request.query_params.get("subject_ids")
            if csv_subjects:
                subject_ids_raw = [part.strip() for part in csv_subjects.split(",") if part.strip()]
        if search:
            translation_model = Question._parler_meta.root_model
            matching_ids = translation_model.objects.filter(
                master_id__in=qs.values("id"),
                title__icontains=search,
            ).values_list("master_id", flat=True)
            qs = qs.filter(id__in=matching_ids).distinct()
        if subject_ids_raw:
            try:
                subject_ids = [int(value) for value in subject_ids_raw]
            except ValueError:
                raise serializers.ValidationError({"subject_ids": "Expected a list of integers."})
            qs = qs.filter(subjects__id__in=subject_ids).distinct()
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        self._log_call(
            method_name="retrieve",
            endpoint="GET /api/question/{id}/",
            input_expected="path pk, body vide",
            output="200 + QuestionSerializer | 404",
        )
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(request=QuestionWritePayloadSerializer)
    def create(self, request, *args, **kwargs):
        self._log_call(
            method_name="create",
            endpoint="POST /api/question/",
            input_expected="JSON (Question + subject_ids + answer_options)",
            output="201 + QuestionSerializer | 400",
        )
        data = self._coerce_json_fields(request.data)
        serializer = self.get_serializer(data=data, context=self.get_serializer_context())
        if not serializer.is_valid():
            logger.debug("CREATE errors: %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        question = serializer.save(created_by=request.user, updated_by=request.user)
        logger.debug("Question created id=%s", question.id)
        return Response(QuestionReadSerializer(question, context=self.get_serializer_context()).data,
                        status=status.HTTP_201_CREATED)

    @extend_schema(request=QuestionWritePayloadSerializer)
    def update(self, request, *args, **kwargs):
        self._log_call(
            method_name="update",
            endpoint="PUT /api/question/{id}/",
            input_expected="path pk + body multipart/JSON complet",
            output="200 + QuestionSerializer | 400 | 404",
        )
        return self._update_internal(request, partial=False)

    @extend_schema(request=QuestionPartialWritePayloadSerializer)
    def partial_update(self, request, *args, **kwargs):
        self._log_call(
            method_name="partial_update",
            endpoint="PATCH /api/question/{question_id}/",
            input_expected="path question_id + body multipart/JSON partiel",
            output="200 + QuestionSerializer | 400 | 404",
        )
        return self._update_internal(request, partial=True)

    def destroy(self, request, *args, **kwargs):
        self._log_call(
            method_name="destroy",
            endpoint="DELETE /api/question/{question_id}/",
            input_expected="path question_id, body vide",
            output="204 | 404",
        )
        return super().destroy(request, *args, **kwargs)

    # ==========================================================
    # Factorisation update / partial_update (propre)
    # ==========================================================
    def _update_internal(self, request, *, partial: bool):
        instance = self.get_object()
        data = self._coerce_json_fields(request.data)

        serializer_class = QuestionPartialRequestSerializer if partial else QuestionWriteSerializer
        serializer = serializer_class(
            instance,
            data=data,
            partial=partial,
            context=self.get_serializer_context(),
        )
        if not serializer.is_valid():
            logger.debug("UPDATE errors: %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        question = serializer.save(updated_by=request.user)

        logger.debug("Question updated id=%s partial=%s", question.id, partial)
        return Response(QuestionReadSerializer(question, context=self.get_serializer_context()).data,
                        status=status.HTTP_200_OK)

    # ── Export / Import structuré ──────────────────────────────────────────────

    @action(detail=False, methods=["get"], url_path="export-structured",
            permission_classes=[IsQuestionDomainManager])
    def export_structured(self, request, *args, **kwargs):
        """
        Export les questions (filtrées par domain= et/ou ids=) en JSON ou ZIP (si médias).
        """
        qs = self.filter_queryset(self.get_queryset())
        domain_id = request.query_params.get("domain")
        if domain_id:
            qs = qs.filter(domain_id=domain_id)

        ids_param = request.query_params.get("ids")
        if ids_param:
            try:
                question_ids = [int(i.strip()) for i in ids_param.split(",") if i.strip()]
            except ValueError:
                return Response({"detail": "Paramètre 'ids' invalide."}, status=status.HTTP_400_BAD_REQUEST)
            qs = qs.filter(pk__in=question_ids)

        data = export_questions(qs)

        if data["domain"] is None:
            return Response({"detail": "Aucune question à exporter."}, status=status.HTTP_204_NO_CONTENT)

        timestamp = timezone.now().strftime("%Y%m%d%H%M%S")
        domain_id_val = data["domain"]["id"]
        base_name = f"{timestamp}_{domain_id_val}_export"

        # Image / video / file content lives in content blocks now —
        # the legacy ``QuestionMedia`` + ZIP-bundled binaries path is
        # gone. Export is always a single JSON file.
        content = json.dumps(data, ensure_ascii=False, indent=2)
        return HttpResponse(
            content,
            content_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{base_name}.json"'},
        )

    @action(detail=False, methods=["post"], url_path="import-structured",
            parser_classes=[MultiPartParser, FormParser, JSONParser],
            permission_classes=[IsQuestionDomainManager])
    def import_structured(self, request, *args, **kwargs):
        """
        Importe des questions depuis un JSON structuré.
        Accepte un fichier multipart (``json_file``) ou un body JSON direct.
        """
        uploaded = request.FILES.get("json_file")
        if uploaded:
            raw = uploaded.read()
            try:
                data = json.loads(raw.decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError) as exc:
                return Response({"detail": f"Fichier JSON invalide : {exc}"}, status=status.HTTP_400_BAD_REQUEST)
        elif isinstance(request.data, dict) and "version" in request.data:
            data = request.data
        else:
            return Response(
                {"detail": "Fournir un fichier 'json_file' ou un body JSON structuré."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = import_questions(data, request.user)
        except StructuredImportPermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except StructuredImportError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.exception("import_structured: unexpected error")
            return Response({"detail": f"Erreur inattendue : {exc}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(result, status=status.HTTP_200_OK)
