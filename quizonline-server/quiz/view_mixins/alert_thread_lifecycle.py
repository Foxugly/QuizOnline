"""
Open / close lifecycle slice of ``QuizAlertThreadViewSet``.

Two paired endpoints that flip the open/closed state of an alert
thread. Both reuse ``require_alert_owner`` so the gate stays in one
place (a non-owner participant can read but not steer the thread).
"""
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from quiz.alerting import require_alert_owner
from quiz.serializers import QuizAlertThreadDetailSerializer


class AlertThreadLifecycleMixin:
    # No class docstring on purpose: drf-spectacular falls back to the
    # host view's class docstring when an ``@action`` has no explicit
    # ``description``, so a mixin docstring would leak into the OpenAPI
    # description of every action that doesn't set its own.

    @extend_schema(
        tags=["QuizAlert"],
        summary="Clôturer une conversation d'alerte quiz",
        responses={200: QuizAlertThreadDetailSerializer},
    )
    @action(detail=True, methods=["post"], url_path="close")
    def close(self, request, *args, **kwargs):
        self._log_call(
            method_name="close",
            endpoint="POST /api/quiz/alerts/{alert_id}/close/",
            input_expected="body vide",
            output="200 + QuizAlertThreadDetailSerializer | 403 | 404",
            extra={"alert_id": kwargs.get("alert_id")},
        )
        thread = self.get_object()
        require_alert_owner(thread, request.user, "clôturer")
        thread.close(user=request.user)
        out = QuizAlertThreadDetailSerializer(thread, context=self.get_serializer_context())
        return Response(out.data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=["QuizAlert"],
        summary="Rouvrir une conversation d'alerte quiz",
        responses={200: QuizAlertThreadDetailSerializer},
    )
    @action(detail=True, methods=["post"], url_path="reopen")
    def reopen(self, request, *args, **kwargs):
        self._log_call(
            method_name="reopen",
            endpoint="POST /api/quiz/alerts/{alert_id}/reopen/",
            input_expected="body vide",
            output="200 + QuizAlertThreadDetailSerializer | 403 | 404",
            extra={"alert_id": kwargs.get("alert_id")},
        )
        thread = self.get_object()
        require_alert_owner(thread, request.user, "rouvrir")
        thread.reopen()
        out = QuizAlertThreadDetailSerializer(thread, context=self.get_serializer_context())
        return Response(out.data, status=status.HTTP_200_OK)
