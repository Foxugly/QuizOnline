from __future__ import annotations

from django.db import transaction

from .models import LessonQuiz


def compute_score_percent(quiz_session) -> int:
    """
    Compute % of correctly-answered QuizQuestions in a session.

    Iterates the related QuizQuestionAnswer rows and counts the truthy
    ``is_correct`` ones. Accepts a few plausible reverse-FK names so future
    refactors of quiz.QuizQuestionAnswer.quiz.related_name don't silently
    return zero.
    """
    related_manager = None
    for accessor in ("answers", "questionanswers", "quizquestionanswer_set"):
        related_manager = getattr(quiz_session, accessor, None)
        if related_manager is not None:
            break
    if related_manager is None:
        return 0
    answers = list(related_manager.all())
    if not answers:
        return 0
    correct = sum(1 for a in answers if getattr(a, "is_correct", False))
    return int((correct / len(answers)) * 100)


@transaction.atomic
def evaluate_lesson_quiz_attempt(*, quiz_session) -> None:
    bindings = LessonQuiz.objects.filter(
        quiz_template=quiz_session.quiz_template,
    ).select_related("lesson", "course")
    if not bindings.exists():
        return
    score = compute_score_percent(quiz_session)
    for binding in bindings:
        if score < binding.required_score_percent:
            continue
        if binding.lesson_id:
            from lms_enrollment.services import mark_lesson_completed
            mark_lesson_completed(user=quiz_session.user, lesson=binding.lesson)
        elif binding.course_id:
            from lms_enrollment.services import issue_certificate_if_eligible
            issue_certificate_if_eligible(user=quiz_session.user, course=binding.course)
