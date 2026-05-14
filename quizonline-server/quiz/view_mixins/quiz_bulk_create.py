"""
Bulk-create slice of ``QuizViewSet``.

A single action that fans out a template into one ``Quiz`` row per
target user. Permission check is bespoke: ``IsOwnerOrStaff`` is too
narrow because trainers can be authorised to send a template via
``user_can_manage_template_assignments`` without being staff, so the
host's ``get_permissions`` only requires ``IsAuthenticated`` for this
action and the fine-grained gate is enforced here.
"""
import logging

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from quiz.access import (
    user_can_manage_template_assignments,
    validate_target_user_domain,
)
from quiz.models import QuizTemplate
from quiz.services import create_quizzes_from_template

logger = logging.getLogger(__name__)


class QuizBulkCreateMixin:
    # No class docstring on purpose: drf-spectacular falls back to the
    # host view's class docstring when an ``@action`` has no explicit
    # ``description``, so a mixin docstring would leak into the OpenAPI
    # description of every action that doesn't set its own.

    @action(
        detail=False,
        methods=["post"],
        url_path="bulk-create-from-template",
        permission_classes=[IsAuthenticated],
    )
    def bulk_create_from_template(self, request, *args, **kwargs):
        quiz_template_id = request.data.get("quiz_template_id")
        user_ids = request.data.get("user_ids", [])

        if not quiz_template_id or not isinstance(user_ids, list) or not user_ids:
            logger.warning(
                "bulk_create_from_template: invalid input quiz_template_id=%s user_ids=%s",
                quiz_template_id,
                user_ids,
            )
            return Response(
                {"detail": "quiz_template_id et une liste user_ids sont requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            qt = QuizTemplate.objects.get(pk=quiz_template_id)
        except QuizTemplate.DoesNotExist:
            logger.warning("bulk_create_from_template: QuizTemplate not found id=%s", quiz_template_id)
            return Response(
                {"detail": "QuizTemplate introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not user_can_manage_template_assignments(request.user, qt):
            raise PermissionDenied("Vous ne pouvez pas envoyer ce quiz.")

        users = get_user_model().objects.filter(id__in=user_ids)
        created = create_quizzes_from_template(
            quiz_template=qt,
            users=users,
            validate_target_user=validate_target_user_domain,
            assigned_by=request.user,
        )
        logger.debug(
            "bulk_create_from_template: created=%s quiz_template_id=%s users_count=%s",
            len(created),
            qt.id,
            len(user_ids),
        )
        serializer = self.get_serializer(created, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
