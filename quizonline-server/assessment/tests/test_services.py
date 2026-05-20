import pytest

from assessment.models import LessonQuiz
from assessment.services import compute_score_percent, evaluate_lesson_quiz_attempt
from enrollment.models import LessonProgress
from quiz.models import Quiz


@pytest.mark.django_db
def test_compute_score_percent_zero_when_no_questions(quiz_template, learner):
    q = Quiz.objects.create(
        domain=quiz_template.domain, quiz_template=quiz_template, user=learner, active=False,
    )
    assert compute_score_percent(q) == 0


@pytest.mark.django_db
def test_evaluate_lesson_quiz_marks_lesson_completed(lesson, quiz_template, learner, monkeypatch):
    LessonQuiz.objects.create(lesson=lesson, quiz_template=quiz_template, required_score_percent=50)
    monkeypatch.setattr("assessment.services.compute_score_percent", lambda s: 100)
    session = Quiz.objects.create(
        domain=quiz_template.domain, quiz_template=quiz_template, user=learner, active=False,
    )
    evaluate_lesson_quiz_attempt(quiz_session=session)
    assert LessonProgress.objects.filter(user=learner, lesson=lesson, is_completed=True).exists()
