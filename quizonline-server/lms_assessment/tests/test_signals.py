import pytest

from lms_assessment.models import LessonQuiz
from enrollment.models import LessonProgress
from quiz.models import Quiz


@pytest.mark.django_db
def test_quiz_close_propagates_to_lesson_progress(lesson, quiz_template, learner, monkeypatch):
    LessonQuiz.objects.create(lesson=lesson, quiz_template=quiz_template, required_score_percent=50)
    monkeypatch.setattr("lms_assessment.services.compute_score_percent", lambda s: 100)
    q = Quiz.objects.create(
        domain=quiz_template.domain, quiz_template=quiz_template, user=learner, active=True,
    )
    q.active = False
    q.save()  # triggers signal
    assert LessonProgress.objects.filter(user=learner, lesson=lesson, is_completed=True).exists()
