"""
Coalesced unread-counts endpoint.

The topbar shows two badges that polled two endpoints on a 60-second
tick each:
- ``GET /api/notification/unread-count/`` → unread in-app notifications
- ``GET /api/quiz/alerts/unread-count/``  → unread quiz alert messages

That is two round-trips per minute per signed-in tab. This endpoint
returns both counts in a single response so the polling collapses to
one request per tick.

Returns:
    ``{"notifications": <int>, "quiz_alerts": <int>}``
"""
from __future__ import annotations

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from customuser.models import Notification
from quiz.alerting import alert_thread_queryset_for_user, unread_total_for_queryset


class UnreadCountsView(APIView):
    """Fused unread-counts endpoint — see module docstring."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["UnreadCounts"],
        summary="Compter en une seule requête les notifications + alertes non lues",
        description=(
            "Coalesces the two per-minute polls the topbar fires "
            "(/notification/unread-count/ and /quiz/alerts/unread-count/) "
            "into one request. Returns the same numbers as the dedicated "
            "endpoints — they remain available for backwards compatibility."
        ),
        responses={200: OpenApiResponse(description='{"notifications": int, "quiz_alerts": int}',
                                        response=OpenApiTypes.OBJECT)},
    )
    def get(self, request, *args, **kwargs):
        user = request.user

        notifications_count = (
            Notification.objects
            .filter(user=user, read_at__isnull=True, deleted_at__isnull=True)
            .count()
        )

        quiz_alerts_count = unread_total_for_queryset(
            alert_thread_queryset_for_user(user), user,
        )

        return Response({
            "notifications": notifications_count,
            "quiz_alerts": quiz_alerts_count,
        })
