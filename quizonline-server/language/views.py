from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
    OpenApiParameter,
    OpenApiResponse,
    OpenApiTypes,
)
from rest_framework import filters
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from config.permissions import IsSuperUser
from config.tools import ErrorDetailSerializer, MyModelViewSet

from .models import Language
from .serializers import LanguageReadSerializer, LanguageWriteSerializer, LanguagePartialSerializer


@extend_schema_view(
    list=extend_schema(
        tags=["Language"],
        summary="Lister les langues",
        description=(
                "Liste paginée des langues.\n\n"
                "Supporte :\n"
                "- `search` (DRF SearchFilter sur `code`, `name`)\n"
                "- `ordering` (DRF OrderingFilter sur `code`, `name`, `id`)\n"
        ),
        parameters=[
            OpenApiParameter(
                name="search",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Recherche simple sur code/name.",
            ),
            OpenApiParameter(
                name="ordering",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Tri (ex: "code", "-name", "id").',
            ),
            OpenApiParameter(
                name="page",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Numéro de page (si pagination activée).",
            ),
            OpenApiParameter(
                name="page_size",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Taille de page (si PageNumberPagination configurée).",
            ),
        ],
        responses={
            200: LanguageReadSerializer(many=True),
        },
    ),
    retrieve=extend_schema(
        tags=["Language"],
        summary="Récupérer une langue",
        parameters=[
            OpenApiParameter(
                name="lang_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
                description="ID de la langue.",
            )
        ],
        responses={
            200: LanguageReadSerializer,
            404: OpenApiResponse(response=ErrorDetailSerializer, description="Not found"),
        },
    ),
    create=extend_schema(
        tags=["Language"],
        summary="Créer une langue",
        request=LanguageWriteSerializer,
        responses={
            201: LanguageReadSerializer,
            400: OpenApiResponse(description="Validation error"),
            403: OpenApiResponse(response=ErrorDetailSerializer, description="Forbidden (admin only)"),
        },
    ),
    update=extend_schema(
        tags=["Language"],
        summary="Mettre à jour une langue (PUT)",
        parameters=[
            OpenApiParameter(
                name="lang_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
                description="ID de la langue.",
            )
        ],
        request=LanguageWriteSerializer,
        responses={
            200: LanguageReadSerializer,
            400: OpenApiResponse(description="Validation error"),
            404: OpenApiResponse(response=ErrorDetailSerializer, description="Not found"),
            403: OpenApiResponse(response=ErrorDetailSerializer, description="Forbidden (admin only)"),
        },
    ),
    partial_update=extend_schema(
        tags=["Language"],
        summary="Mettre à jour une langue (PATCH)",
        parameters=[
            OpenApiParameter(
                name="lang_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
                description="ID de la langue.",
            )
        ],
        request=LanguagePartialSerializer,
        responses={
            200: LanguageReadSerializer,
            400: OpenApiResponse(description="Validation error"),
            404: OpenApiResponse(response=ErrorDetailSerializer, description="Not found"),
            403: OpenApiResponse(response=ErrorDetailSerializer, description="Forbidden (admin only)"),
        },
    ),
    destroy=extend_schema(
        tags=["Language"],
        summary="Supprimer une langue",
        parameters=[
            OpenApiParameter(
                name="lang_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
                description="ID de la langue.",
            )
        ],
        responses={
            204: OpenApiResponse(description="No Content"),
            404: OpenApiResponse(response=ErrorDetailSerializer, description="Not found"),
            403: OpenApiResponse(response=ErrorDetailSerializer, description="Forbidden (admin only)"),
        },
    ),
)
class LanguageViewSet(MyModelViewSet):
    queryset = Language.objects.all()

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["active", "code"]
    search_fields = ["code", "name"]
    ordering_fields = ["code", "name", "id"]
    ordering = ["code"]
    lookup_field = "pk"
    lookup_url_kwarg = "lang_id"

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsSuperUser()]

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return LanguageReadSerializer
        if self.action == "partial_update":
            return LanguagePartialSerializer
        return LanguageWriteSerializer

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        instance = self.get_queryset().get(code=response.data["code"])
        return Response(LanguageReadSerializer(instance, context=self.get_serializer_context()).data, status=response.status_code)

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        return Response(LanguageReadSerializer(self.get_object(), context=self.get_serializer_context()).data, status=response.status_code)

    def partial_update(self, request, *args, **kwargs):
        response = super().partial_update(request, *args, **kwargs)
        return Response(LanguageReadSerializer(self.get_object(), context=self.get_serializer_context()).data, status=response.status_code)
