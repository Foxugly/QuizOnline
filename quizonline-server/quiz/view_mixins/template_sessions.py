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
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from quiz.access import user_can_manage_template_assignments
from quiz.querysets import template_sessions_queryset
from quiz.serializers import QuizAssignmentListSerializer


def _not_found():
    return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)


class TemplateSessionsPagination(PageNumberPagination):
    """500-row cap on the ``/api/quiz/template/<id>/sessions/`` endpoint.

    The SPA's template-results page renders a client-side paginated
    PrimeNG table — it assumes the full session list fits in memory. A
    popular template (10k+ sessions) would otherwise flood the wire with
    a single response. 500 is the safety ceiling: any template with
    more sessions will need a future server-paginated UI; until then,
    callers get the first 500 most-recent and a ``count`` they can
    surface to flag the truncation.
    """
    page_size = 500
    page_size_query_param = "page_size"
    max_page_size = 1000


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
    @action(
        detail=True,
        methods=["get"],
        url_path="sessions",
        pagination_class=TemplateSessionsPagination,
    )
    def sessions(self, request, *args, **kwargs):
        quiz_template = self.get_object()
        if not user_can_manage_template_assignments(request.user, quiz_template):
            return _not_found()

        sessions = template_sessions_queryset(quiz_template)

        # Use the per-endpoint ``TemplateSessionsPagination`` (size 500)
        # so popular templates don't dump 10k rows in one shot. The SPA
        # already handles both shapes — bare array AND paginated
        # ``{count, next, previous, results}`` — see
        # ``quiz.service.ts::listTemplateSessions``.
        paginator = TemplateSessionsPagination()
        page = paginator.paginate_queryset(sessions, request, view=self)
        if page is not None:
            serializer = QuizAssignmentListSerializer(
                page, many=True, context=self.get_serializer_context(),
            )
            return paginator.get_paginated_response(serializer.data)

        serializer = QuizAssignmentListSerializer(
            sessions,
            many=True,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data, status=status.HTTP_200_OK)
