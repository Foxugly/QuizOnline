from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from .models import Quiz
from .session_integrity import reconcile_quiz_answers
from .notifications import (
    notify_quiz_assigned_on_commit,
    notify_quiz_completed_on_commit,
)

# Backward-compatible names still referenced by some tests and patch points.
notify_quiz_assigned = notify_quiz_assigned_on_commit
notify_quiz_completed = notify_quiz_completed_on_commit


def create_quizzes_from_template(*, quiz_template, users, validate_target_user, assigned_by=None) -> list[Quiz]:
    with transaction.atomic():
        for user in users:
            validate_target_user(quiz_template, user)

        created = Quiz.objects.bulk_create([
            Quiz(
                domain_id=quiz_template.domain_id,
                quiz_template=quiz_template,
                user=user,
                active=False,
            )
            for user in users
        ])

        for quiz in created:
            notify_quiz_assigned(quiz, assigned_by=assigned_by)

    return created


def close_quiz_session(*, quiz) -> Quiz:
    reconcile_quiz_answers(quiz)

    quiz.active = False
    if not quiz.ended_at:
        quiz.ended_at = timezone.now()
    quiz.save(update_fields=["active", "ended_at"])
    notify_quiz_completed(quiz)
    return quiz
