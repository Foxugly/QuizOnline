from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from .models import Quiz, QuizTemplate
from .notifications import (
    notify_quiz_assigned_on_commit,
    notify_quiz_completed_on_commit,
)
from .session_integrity import reconcile_quiz_answers

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


class QuizAlreadyStartedError(Exception):
    """The target user already has a started/ended EXAM session for this
    template — single-attempt is enforced, so a new one cannot be created."""


@transaction.atomic
def create_quiz_for_user(*, quiz_template: QuizTemplate, target_user, assigned_by=None):
    """Create (or return the existing unstarted) quiz session for
    ``target_user`` from ``quiz_template``.

    For EXAM templates, enforces single-attempt under a row lock:
      - an existing UNSTARTED session is returned as ``(quiz, False)``;
      - an existing STARTED/ENDED session raises :class:`QuizAlreadyStartedError`;
      - otherwise a fresh session is created and returned as ``(quiz, True)``.
    Non-exam templates always create a fresh session.

    Fires the assignment notification on commit when ``assigned_by`` is set and
    differs from ``target_user``. Returns ``(quiz, created)``.
    """
    qt = quiz_template
    if qt.mode == QuizTemplate.MODE_EXAM:
        qt = QuizTemplate.objects.select_for_update().get(pk=qt.pk)
        existing = (
            Quiz.objects.select_for_update()
            .filter(quiz_template=qt, user=target_user)
            .order_by("-created_at", "-id")
            .first()
        )
        if existing is not None:
            if existing.started_at or existing.ended_at:
                raise QuizAlreadyStartedError()
            return existing, False

    quiz = Quiz.objects.create(
        domain_id=qt.domain_id,
        quiz_template=qt,
        user=target_user,
        active=False,
    )
    if assigned_by is not None and assigned_by.id != target_user.id:
        notify_quiz_assigned_on_commit(quiz, assigned_by=assigned_by)
    return quiz, True


def close_quiz_session(*, quiz) -> Quiz:
    reconcile_quiz_answers(quiz)

    quiz.active = False
    # Record the actual finish time. If the user clicked "Terminer" before
    # the planned ended_at (timed quiz), stamp ended_at to "now" so the
    # session duration reflects when they actually stopped, not the slot
    # that was provisionally reserved at start. If the timer already
    # expired (ended_at <= now) we keep that value — that's the real
    # endpoint of the session.
    now = timezone.now()
    if not quiz.ended_at or quiz.ended_at > now:
        quiz.ended_at = now
    quiz.save(update_fields=["active", "ended_at"])
    notify_quiz_completed(quiz)
    return quiz
