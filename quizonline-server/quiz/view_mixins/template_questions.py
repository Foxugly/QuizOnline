"""
Question CRUD slice of ``QuizTemplateViewSet``.

Three flat actions that manage the ``QuizQuestion`` rows attached to a
template directly from the template URL (``/api/quiz/template/{qt_id}/``)
so the SPA doesn't have to navigate to the nested viewset for simple
edits. The nested ``QuizTemplateQuizQuestionViewSet`` is still the
canonical CRUD entry point for the list/retrieve flow.

Mixed into ``QuizTemplateViewSet`` so the host's queryset and
permissions (``CanManageQuizTemplate`` on non-read actions) still apply.
"""
import logging

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from quiz.models import QuizQuestion
from quiz.serializers import (
    QuizQuestionReadSerializer,
    QuizQuestionWriteSerializer,
)

logger = logging.getLogger(__name__)


class TemplateQuestionActionsMixin:
    # No class docstring on purpose: drf-spectacular falls back to the
    # host view's class docstring when an ``@action`` has no explicit
    # ``description``, so a mixin docstring would leak into the OpenAPI
    # description of every action that doesn't set its own.

    @extend_schema(
        tags=["QuizTemplate"],
        summary="Ajouter une question à un template",
        request=QuizQuestionWriteSerializer,
        responses={
            201: QuizQuestionReadSerializer,
            400: OpenApiResponse(description="Validation error"),
            404: OpenApiResponse(description="Template introuvable"),
        },
    )
    @action(detail=True, methods=["post"], url_path="question")
    def add_question(self, request, pk=None, *args, **kwargs):
        self._log_call(
            method_name="add_question",
            endpoint="POST /api/quiz/template/{qt_id}/question/",
            input_expected="body: QuizQuestionSerializer fields (question_id, sort_order?, weight?)",
            output="201 + QuizQuestionSerializer | 400 | 404",
            extra={"pk": pk},
        )
        quiz_template = self.get_object()
        serializer = QuizQuestionWriteSerializer(
            data=request.data,
            context={"quiz_template": quiz_template},
        )
        serializer.is_valid(raise_exception=True)
        quizquestion = serializer.save()
        out = QuizQuestionReadSerializer(quizquestion, context=self.get_serializer_context())
        logger.debug(
            "add_question: created quizquestion_id=%s quiz_template_id=%s",
            quizquestion.id,
            quiz_template.id,
        )
        return Response(out.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        tags=["QuizTemplate"],
        summary="Mettre à jour une question (QuizQuestion) d’un template",
        request=QuizQuestionWriteSerializer,
        responses={
            200: QuizQuestionReadSerializer,
            400: OpenApiResponse(description="Validation error"),
            404: OpenApiResponse(description="Template ou QuizQuestion introuvable"),
        },
        parameters=[
            OpenApiParameter("quizquestion_id", OpenApiTypes.INT, OpenApiParameter.PATH),
        ],
    )
    @action(detail=True, methods=["patch", "put"], url_path=r"question/(?P<qq_id>\d+)")
    def update_question(self, request, pk=None, qq_id=None, *args, **kwargs):
        self._log_call(
            method_name="update_question",
            endpoint="PUT/PATCH /api/quiz/template/{qt_id}/question/{qq_id}/",
            input_expected="path pk + quizquestion_id + body (QuizQuestionSerializer)",
            output="200 + QuizQuestionSerializer | 400 | 404",
            extra={"qt_id": pk, "qq_id": qq_id},
        )
        quiz_template = self.get_object()
        try:
            quizquestion = quiz_template.quiz_questions.get(pk=qq_id)
        except QuizQuestion.DoesNotExist:
            return Response(
                {"detail": "QuizQuestion introuvable pour ce template."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = QuizQuestionWriteSerializer(
            quizquestion,
            data=request.data,
            partial=True,
            context={"quiz_template": quiz_template},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        logger.debug("update_question: updated quizquestion_id=%s", quizquestion.id)
        out = QuizQuestionReadSerializer(quizquestion, context=self.get_serializer_context())
        return Response(out.data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=["QuizTemplate"],
        summary="Supprimer une question (QuizQuestion) d’un template",
        responses={
            204: OpenApiResponse(description="No Content"),
            404: OpenApiResponse(description="Template ou QuizQuestion introuvable"),
        },
        parameters=[
            OpenApiParameter("qq_id", OpenApiTypes.INT, OpenApiParameter.PATH),
        ],
    )
    @action(detail=True, methods=["delete"], url_path=r"question/(?P<qq_id>[^/.]+)")
    def delete_question(self, request, pk=None, qq_id=None, *args, **kwargs):
        self._log_call(
            method_name="delete_question",
            endpoint="DELETE /api/quiz/template/{qt_id}/question/{qq_id}/",
            input_expected="path pk + quizquestion_id, body vide",
            output="204 | 404",
            extra={"pk": pk, "quizquestion_id": qq_id},
        )
        quiz_template = self.get_object()
        try:
            quizquestion = quiz_template.quiz_questions.get(pk=qq_id)
        except QuizQuestion.DoesNotExist:
            logger.warning(
                "delete_question: quizquestion not found quiz_template_id=%s quizquestion_id=%s",
                quiz_template.id,
                qq_id,
            )
            return Response(
                {"detail": "QuizQuestion introuvable pour ce template."},
                status=status.HTTP_404_NOT_FOUND,
            )
        quizquestion.delete()
        logger.debug("delete_question: deleted quizquestion_id=%s", qq_id)
        return Response(status=status.HTTP_204_NO_CONTENT)
