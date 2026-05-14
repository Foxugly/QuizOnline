"""
"Generate from subjects" slice of ``QuizTemplateViewSet``.

Picks a random sample of active questions across the requested subjects
and materialises them as ``QuizQuestion`` rows on a freshly-created
template. Useful when an author wants a quick template seeded with
existing questions rather than composing it manually.

Mixed into ``QuizTemplateViewSet`` so the host's ``get_permissions``
keeps this action open to any authenticated user (unlike the rest of
the management endpoints which are staff-only).
"""
import logging
import random

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from question.models import Question
from quiz.models import QuizQuestion, QuizTemplate
from quiz.serializers import (
    GenerateFromSubjectsInputSerializer,
    QuizTemplateSerializer,
)

logger = logging.getLogger(__name__)


class TemplateGenerateFromSubjectsMixin:
    # No class docstring on purpose: drf-spectacular falls back to the
    # host view's class docstring when an ``@action`` has no explicit
    # ``description``, so a mixin docstring would leak into the OpenAPI
    # description of every action that doesn't set its own.

    @extend_schema(
        tags=["QuizTemplate"],
        summary="Générer un template depuis des sujets",
        request=GenerateFromSubjectsInputSerializer,
        responses={
            201: QuizTemplateSerializer,
            400: OpenApiResponse(description="Input invalide / aucune question trouvée"),
        },
    )
    @action(detail=False, methods=["post"], url_path="generate-from-subjects")
    def generate_from_subjects(self, request, *args, **kwargs):
        self._log_call(
            method_name="generate_from_subjects",
            endpoint="POST /api/quiz/template/generate-from-subjects/",
            input_expected="body: {title, subject_ids[], max_questions?}",
            output="201 + QuizTemplateSerializer | 400",
        )
        serializer = GenerateFromSubjectsInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        title = serializer.validated_data["title"]
        domain_id = serializer.validated_data["domain_id"]
        subject_ids = serializer.validated_data["subject_ids"]
        max_questions = serializer.validated_data["max_questions"]
        with_duration = serializer.validated_data["with_duration"]
        duration = serializer.validated_data["duration"] or 10

        ids = list(
            Question.objects.filter(
                subjects__id__in=subject_ids,
                active=True,
            )
            .distinct()
            .values_list("id", flat=True)
        )
        if not ids:
            return Response({"detail": "Aucune question trouvée pour ces sujets."},
                            status=status.HTTP_400_BAD_REQUEST)

        n_questions = min(len(ids), max_questions)
        picked_ids = random.sample(ids, n_questions)
        questions_qs = Question.objects.filter(id__in=picked_ids)

        if not questions_qs.exists():
            logger.warning("generate_from_subjects: no questions found subject_ids=%s", subject_ids)
            return Response({"detail": "Aucune question trouvée pour ces sujets."},
                            status=status.HTTP_400_BAD_REQUEST)

        quiz_template = QuizTemplate.objects.create(
            title=title,
            domain_id=domain_id,
            max_questions=n_questions,
            permanent=True,
            active=True,
            with_duration=with_duration,
            duration=duration,
            created_by=request.user,
            updated_by=request.user,
            is_public=False,
        )
        quiz_questions = [
            QuizQuestion(quiz=quiz_template, question=question, sort_order=index, weight=1)
            for index, question in enumerate(questions_qs, start=1)
        ]
        QuizQuestion.objects.bulk_create(quiz_questions)
        out = self.get_serializer(quiz_template)
        logger.debug(
            "generate_from_subjects: created quiz_template_id=%s nb_questions=%s",
            quiz_template.id,
            len(quiz_questions),
        )
        return Response(out.data, status=status.HTTP_201_CREATED)
