"""
Messaging slice of ``QuizAlertThreadViewSet``.

Two endpoints driving the conversational side of alert threads:
- ``POST .../{alert_id}/message/`` — append a new message to an open thread.
- ``GET  .../unread-count/`` — aggregate count for the navbar badge.

Both are intentionally split from the lifecycle (close/reopen) mixin
because their dependencies are different (one needs the create
serializer + thread context, the other only the queryset + a counting
helper).
"""
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from quiz.alerting import unread_total_for_queryset
from quiz.serializers import (
    QuizAlertMessageCreateSerializer,
    QuizAlertMessageSerializer,
)


class AlertThreadMessagingMixin:
    # No class docstring on purpose: drf-spectacular falls back to the
    # host view's class docstring when an ``@action`` has no explicit
    # ``description``, so a mixin docstring would leak into the OpenAPI
    # description of every action that doesn't set its own.

    @extend_schema(
        tags=["QuizAlert"],
        summary="Répondre à une conversation d'alerte quiz",
        request=QuizAlertMessageCreateSerializer,
        responses={201: QuizAlertMessageSerializer},
    )
    @action(detail=True, methods=["post"], url_path="message")
    def post_message(self, request, *args, **kwargs):
        self._log_call(
            method_name="post_message",
            endpoint="POST /api/quiz/alerts/{alert_id}/message/",
            input_expected="body {body}",
            output="201 + QuizAlertMessageSerializer | 400 | 404",
            extra={"alert_id": kwargs.get("alert_id")},
        )
        thread = self.get_object()
        serializer = self.get_serializer(
            data=request.data,
            context={**self.get_serializer_context(), "thread": thread},
        )
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        out = QuizAlertMessageSerializer(message, context=self.get_serializer_context())
        return Response(out.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        tags=["QuizAlert"],
        summary="Compter les alertes non lues de l'utilisateur courant",
        responses={200: OpenApiResponse(description='{"count": int}')},
    )
    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request, *args, **kwargs):
        qs = self.get_queryset()
        count = unread_total_for_queryset(qs, request.user)
        return Response({"count": count}, status=status.HTTP_200_OK)
