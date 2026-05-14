"""
Sessions slice of ``QuizTemplateViewSet``.

A single read-only endpoint that lists the ``Quiz`` instances (sessions)
created from a given template — used by the "Sessions" tab in the SPA's
template detail page.

Mixed into ``QuizTemplateViewSet`` so its standard queryset and
permission stack still applies. ``user_can_manage_template_assignments``
narrows visibility to staff / template owners / domain managers.
"""
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from quiz.access import user_can_manage_template_assignments
from quiz.querysets import template_sessions_queryset
from quiz.serializers import QuizAssignmentListSerializer


def _not_found():
    return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)


class TemplateSessionsMixin:
    # No class docstring on purpose: drf-spectacular falls back to the
    # host view's class docstring when an ``@action`` has no explicit
    # ``description``, so a mixin docstring would leak into the OpenAPI
    # description of every action that doesn't set its own.

    @extend_schema(
        tags=["QuizTemplate"],
        summary="Lister les sessions envoyées pour un template",
        responses={200: QuizAssignmentListSerializer(many=True)},
    )
    @action(detail=True, methods=["get"], url_path="sessions")
    def sessions(self, request, *args, **kwargs):
        quiz_template = self.get_object()
        if not user_can_manage_template_assignments(request.user, quiz_template):
            return _not_found()

        sessions = template_sessions_queryset(quiz_template)
        serializer = QuizAssignmentListSerializer(
            sessions,
            many=True,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data, status=status.HTTP_200_OK)
