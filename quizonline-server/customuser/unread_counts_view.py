"""
Coalesced unread-counts endpoint.

The topbar shows three badges that each used to poll their own
endpoint:
- ``GET /api/notification/unread-count/`` → unread in-app notifications
- ``GET /api/quiz/alerts/unread-count/``  → unread quiz alert messages
- ``GET /api/me/invitations/``            → pending course invitations
                                            (full list, just counted)

That is three round-trips per page navigation. This endpoint returns
all three numbers in a single response so the polling and per-nav
fetches collapse to one request.

Returns:
    ``{"notifications": <int>, "quiz_alerts": <int>, "course_invitations": <int>}``
"""
from __future__ import annotations

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from customuser.models import Notification
from enrollment.models import CourseInvite
from quiz.alerting import alert_thread_queryset_for_user, unread_total_for_queryset


class UnreadCountsView(APIView):
    """Fused unread-counts endpoint — see module docstring."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["UnreadCounts"],
        summary="Compter en une seule requête les notifications + alertes + invitations en attente",
        description=(
            "Coalesces the three topbar polls "
            "(/notification/unread-count/, /quiz/alerts/unread-count/ and "
            "the count derived from /me/invitations/) into one request. "
            "The dedicated endpoints stay live for backwards compatibility "
            "and for post-mutation force-refresh flows."
        ),
        responses={200: OpenApiResponse(
            description='{"notifications": int, "quiz_alerts": int, "course_invitations": int}',
            response=OpenApiTypes.OBJECT,
        )},
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

        course_invitations_count = (
            CourseInvite.objects
            .filter(invitee=user, status=CourseInvite.STATUS_PENDING)
            .count()
        )

        return Response({
            "notifications": notifications_count,
            "quiz_alerts": quiz_alerts_count,
            "course_invitations": course_invitations_count,
        })
