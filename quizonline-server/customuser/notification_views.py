"""
REST API for the in-app notifications inbox.

The viewset is intentionally narrow: a user can list, mark read,
mark-all-read, soft-delete and check the unread count on their own
notifications. There is no create endpoint — notifications are
emitted server-side by :func:`customuser.notifications.emit_notification`
from the same code paths that fire mailers.
"""
from __future__ import annotations

from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from customuser.models import Notification
from customuser.notification_serializers import NotificationReadSerializer


class NotificationViewSet(viewsets.GenericViewSet):
    """Per-user notifications inbox."""

    serializer_class = NotificationReadSerializer
    permission_classes = [IsAuthenticated]

    def _base_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @extend_schema(
        tags=["Notification"],
        summary="Lister les notifications de l'utilisateur",
        description=(
            "Renvoie les notifications de l'utilisateur courant, paginées et "
            "triées de la plus récente à la plus ancienne.\n\n"
            "Filtre optionnel ``status`` :\n"
            "- ``unread`` (défaut) : non lues et non supprimées\n"
            "- ``all`` : non supprimées (lues + non lues)\n"
            "- ``deleted`` : supprimées (corbeille)"
        ),
        parameters=[
            OpenApiParameter(
                "status", OpenApiTypes.STR, OpenApiParameter.QUERY,
                description="unread | all | deleted (default unread).",
                enum=["unread", "all", "deleted"],
            ),
        ],
        responses={status.HTTP_200_OK: NotificationReadSerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        qs = self._base_queryset()
        status_param = (request.query_params.get("status") or "unread").strip().lower()
        if status_param == "deleted":
            qs = qs.exclude(deleted_at__isnull=True)
        elif status_param == "all":
            qs = qs.filter(deleted_at__isnull=True)
        else:
            qs = qs.filter(read_at__isnull=True, deleted_at__isnull=True)

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        return Response(self.get_serializer(qs, many=True).data)

    @extend_schema(
        tags=["Notification"],
        summary="Compteur de notifications non lues",
        description=(
            "Endpoint léger pour le polling du badge dans le topmenu. Renvoie "
            "``{\"unread\": <int>}`` — pas de pagination, pas de serializer."
        ),
        responses={status.HTTP_200_OK: OpenApiTypes.OBJECT},
    )
    @action(detail=False, methods=["get"], url_path="unread-count", pagination_class=None)
    def unread_count(self, request, *args, **kwargs):
        count = (
            self._base_queryset()
            .filter(read_at__isnull=True, deleted_at__isnull=True)
            .count()
        )
        return Response({"unread": count})

    @extend_schema(
        tags=["Notification"],
        summary="Marquer une notification comme lue",
        request=None,
        responses={status.HTTP_200_OK: NotificationReadSerializer},
    )
    @action(detail=True, methods=["post"], url_path="read", pagination_class=None)
    def mark_read(self, request, pk=None, *args, **kwargs):
        notif = get_object_or_404(self._base_queryset(), pk=pk)
        if notif.read_at is None:
            notif.read_at = timezone.now()
            notif.save(update_fields=["read_at"])
        return Response(self.get_serializer(notif).data)

    @extend_schema(
        tags=["Notification"],
        summary="Marquer toutes les notifications comme lues",
        description="Une seule requête UPDATE — ne touche pas les supprimées.",
        request=None,
        responses={status.HTTP_200_OK: OpenApiTypes.OBJECT},
    )
    @action(detail=False, methods=["post"], url_path="read-all", pagination_class=None)
    def mark_all_read(self, request, *args, **kwargs):
        now = timezone.now()
        updated = (
            self._base_queryset()
            .filter(read_at__isnull=True, deleted_at__isnull=True)
            .update(read_at=now)
        )
        return Response({"updated": updated})

    @extend_schema(
        tags=["Notification"],
        summary="Supprimer (soft) une notification",
        description=(
            "Marque la ligne ``deleted_at = now`` — elle disparaît de la "
            "liste unread/all mais reste accessible via ``?status=deleted``."
        ),
        responses={status.HTTP_204_NO_CONTENT: OpenApiResponse(description="Deleted.")},
    )
    def destroy(self, request, pk=None, *args, **kwargs):
        notif = get_object_or_404(self._base_queryset(), pk=pk)
        if notif.deleted_at is None:
            notif.deleted_at = timezone.now()
            notif.save(update_fields=["deleted_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)
