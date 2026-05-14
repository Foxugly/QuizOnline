"""
Start / close lifecycle slice of ``QuizViewSet``.

Two paired actions that flip the ``started_at`` / ``ended_at`` markers
on a ``Quiz`` row. Both transitions:

- take a ``select_for_update`` row-level lock so two concurrent calls
  cannot both succeed (the SPA retries optimistically on network blips
  and we don't want a double-start race);
- expire the template-side ``can_answer`` window via
  ``expire_if_needed`` before deciding what to do;
- delegate the heavy lifting (score computation, answer freeze) to
  ``services.close_quiz_session`` so the same flow runs from the
  scheduled-expiry path in Celery.
"""
import logging

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from quiz.permissions import IsOwnerOrStaff
from quiz.services import close_quiz_session

logger = logging.getLogger(__name__)


class QuizLifecycleMixin:
    # No class docstring on purpose: drf-spectacular falls back to the
    # host view's class docstring when an ``@action`` has no explicit
    # ``description``, so a mixin docstring would leak into the OpenAPI
    # description of every action that doesn't set its own.

    @action(detail=True, methods=["post"], url_path="start", permission_classes=[IsOwnerOrStaff])
    def start(self, request, quiz_id=None, *args, **kwargs):
        self._log_call(
            method_name="start",
            endpoint="POST /api/quiz/{quiz_id}/start/",
            input_expected="path pk, body vide",
            output="200 + QuizSerializer | 400 | 404",
            extra={"pk": quiz_id},
        )
        with transaction.atomic():
            quiz = get_object_or_404(self.get_queryset().select_for_update(), pk=quiz_id)
            quiz = self._expire_quiz_if_needed(quiz)
            if not quiz.quiz_template.can_answer:
                logger.warning(
                    "start: template not available quiz_id=%s qt_id=%s",
                    quiz.id,
                    quiz.quiz_template_id,
                )
                return Response(
                    {"detail": "Ce quiz n'est pas disponible actuellement."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if quiz.started_at is not None:
                logger.debug("start: already started quiz_id=%s", quiz.id)
                serializer = self.get_serializer(quiz)
                return Response(serializer.data)
            quiz.started_at = timezone.now()
            quiz.active = True
            quiz.save(update_fields=["started_at", "active", "ended_at"])
        logger.debug("start: started quiz_id=%s", quiz.id)
        serializer = self.get_serializer(quiz)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="close", permission_classes=[IsOwnerOrStaff])
    def close(self, request, quiz_id=None, *args, **kwargs):
        self._log_call(
            method_name="close",
            endpoint="POST /api/quiz/{quiz_id}/close/",
            input_expected="path quiz_id, body vide",
            output="200 + QuizSerializer | 404",
            extra={"quiz_id": quiz_id},
        )

        with transaction.atomic():
            quiz = get_object_or_404(self.get_queryset().select_for_update(), pk=quiz_id)

            if quiz.started_at is None:
                return Response(
                    {"detail": "Impossible de cloturer : le quiz n'a jamais ete demarre."},
                    status=status.HTTP_409_CONFLICT,
                )

            if quiz.active is False:
                return Response(
                    {"detail": "Impossible de cloturer : le quiz est deja cloture."},
                    status=status.HTTP_409_CONFLICT,
                )

            quiz = close_quiz_session(quiz=quiz)

        logger.debug("close: closed quiz_id=%s ended_at=%s", quiz.id, quiz.ended_at)
        return self.retrieve(request, *args, **kwargs)
