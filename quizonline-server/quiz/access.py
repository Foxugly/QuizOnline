from __future__ import annotations

from rest_framework.exceptions import PermissionDenied

from config.domain_access import manageable_domain_ids, user_can_access_domain


def user_matches_template_domain(user, quiz_template) -> bool:
    return user_can_access_domain(user, quiz_template.domain_id)


def user_manages_template_domain(user, quiz_template) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    if quiz_template.domain_id is None:
        return False
    return quiz_template.domain_id in manageable_domain_ids(user)


def _has_any_exam_attempt(user, quiz_template) -> bool:
    """Truthy when the user has ever touched this exam template — started,
    in progress, or completed. Exam mode is single-attempt, so this gate
    blocks ``user_can_create_quiz_from_template`` from spawning a second
    Quiz instance once the first has been opened.

    Do NOT use this for read-side access (retrieve / list visibility):
    once an authenticated user has any Quiz instance on a template
    (completed exam included), ``quiz_template.quiz.filter(user=user)
    .exists()`` already grants them read access on the next branch.
    Treating the gate as a deny-read condition was the historical bug
    that 404'd the lesson-view quiz block once the learner had taken
    the exam — see ``test_user_can_access_template_after_completed_exam``.
    """
    return bool(
        user
        and getattr(user, "is_authenticated", False)
        and quiz_template.mode == quiz_template.MODE_EXAM
        and quiz_template.quiz.filter(user=user).exclude(started_at__isnull=True, ended_at__isnull=True).exists()
    )


def _is_publicly_answerable(quiz_template) -> bool:
    """True when any authenticated-or-anonymous viewer should see this
    template: it's marked public AND its window/active flags allow taking
    it. No user parameter — the predicate depends only on the template's
    own state. Anything user-specific (already-enrolled, manages-domain)
    is layered on top by ``user_can_access_template``.
    """
    return bool(quiz_template.is_public and quiz_template.can_answer)


def template_access_decision(user, quiz_template) -> tuple[bool, str]:
    """Same boolean decision as ``user_can_access_template`` plus a short
    machine-readable reason tag. Lets callers (the retrieve view, the
    list filter, future audit hooks) log a diagnostic when the gate
    closes — Sentry has historically caught ``404 Not Found`` on quiz
    templates that turned out to be access denials, and without the
    branch tag debugging meant tracing every conditional by hand.

    Reasons are stable identifiers, not user-facing copy. Keep them
    short and grep-able.
    """
    if not user or not getattr(user, "is_authenticated", False):
        if _is_publicly_answerable(quiz_template):
            return True, "anon.public-answerable"
        return False, "anon.private-or-unanswerable"
    if user.is_superuser:
        return True, "superuser"
    if user_manages_template_domain(user, quiz_template):
        return True, "manages-domain"
    if not quiz_template.can_answer:
        return False, "template-not-answerable"
    if quiz_template.quiz.filter(user=user).exists():
        return True, "has-quiz-instance"
    if _is_publicly_answerable(quiz_template):
        return True, "public-answerable-fallback"
    return False, "private-template-no-attempt"


def user_can_access_template(user, quiz_template) -> bool:
    return template_access_decision(user, quiz_template)[0]


def user_can_manage_template_assignments(user, quiz_template) -> bool:
    return bool(
        user
        and (
            user.is_superuser
            or user_manages_template_domain(user, quiz_template)
        )
    )


def user_can_create_quiz_from_template(user, quiz_template) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if user.is_superuser:
        return True
    if user_manages_template_domain(user, quiz_template):
        return True
    if not quiz_template.can_answer:
        return False
    if _has_any_exam_attempt(user, quiz_template):
        return False
    if quiz_template.quiz.filter(user=user).exists():
        return True
    return _is_publicly_answerable(quiz_template)


def user_can_edit_template(user, quiz_template) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    return user_manages_template_domain(user, quiz_template)


def user_can_delete_template(user, quiz_template) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    if user_manages_template_domain(user, quiz_template):
        return True
    return quiz_template.created_by_id == getattr(user, "id", None)


def validate_target_user_domain(quiz_template, target_user) -> None:
    if user_matches_template_domain(target_user, quiz_template):
        return
    raise PermissionDenied("L'utilisateur cible n'appartient pas au meme domaine que ce quiz.")
