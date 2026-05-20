import pytest

from lms_assessment.models import LessonQuiz
from course.models import Section
from lesson.models import Lesson
from lms_enrollment.models import Certificate
from lms_enrollment.services import enroll_user_to_course, mark_lesson_completed
from quiz.models import Quiz


@pytest.mark.django_db
def test_full_path_with_final_quiz(course, quiz_template, learner, monkeypatch):
    section = Section.objects.create(course=course, order=0, is_published=True)
    lesson = Lesson.objects.create(section=section, slug="l", order=0, is_published=True)
    LessonQuiz.objects.create(course=course, quiz_template=quiz_template, required_score_percent=70)

    enroll_user_to_course(user=learner, course=course)

    # complete the lesson (no validation quiz on this lesson)
    mark_lesson_completed(user=learner, lesson=lesson)

    # no final quiz session yet -> no certificate
    assert Certificate.objects.filter(user=learner, course=course).count() == 0

    # simulate final quiz pass
    import lms_assessment.services as svc
    monkeypatch.setattr(svc, "compute_score_percent", lambda s: 80)
    q = Quiz.objects.create(domain=quiz_template.domain, quiz_template=quiz_template, user=learner, active=True)
    q.active = False
    q.save()  # post_save signal triggers evaluate_lesson_quiz_attempt

    assert Certificate.objects.filter(user=learner, course=course).count() == 1
