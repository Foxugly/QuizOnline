import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from assessment.models import LessonQuiz


@pytest.mark.django_db
def test_lessonquiz_must_have_exactly_one_target(lesson, course, quiz_template):
    # Both set → fail
    lq = LessonQuiz(lesson=lesson, course=course, quiz_template=quiz_template)
    with pytest.raises((ValidationError, IntegrityError)):
        lq.full_clean()
        lq.save()


@pytest.mark.django_db
def test_lessonquiz_lesson_bound_ok(lesson, quiz_template):
    lq = LessonQuiz(lesson=lesson, quiz_template=quiz_template, required_score_percent=70)
    lq.full_clean()
    lq.save()
    assert lq.pk is not None


@pytest.mark.django_db
def test_lessonquiz_course_bound_ok(course, quiz_template):
    lq = LessonQuiz(course=course, quiz_template=quiz_template, required_score_percent=80)
    lq.full_clean()
    lq.save()
    assert lq.pk is not None


@pytest.mark.django_db
def test_lessonquiz_quiz_template_domain_must_match(lesson, owner, fr_lang):
    from domain.models import Domain
    from quiz.models import QuizTemplate
    other = Domain.objects.create(owner=owner)
    other.set_current_language("fr")
    other.name = "X"
    other.save()
    other.allowed_languages.add(fr_lang)
    other_qt = QuizTemplate(domain=other, title="OT", created_by=owner)
    other_qt.save()
    lq = LessonQuiz(lesson=lesson, quiz_template=other_qt)
    with pytest.raises(ValidationError):
        lq.full_clean()
