import pytest

from course.models import Section
from lesson.models import Lesson
from lms_enrollment.models import Certificate
from lms_enrollment.services import (
    enroll_user_to_course,
    issue_certificate_if_eligible,
    mark_lesson_completed,
)


@pytest.fixture
def fully_completable_course(course):
    s = Section.objects.create(course=course, order=0, is_published=True)
    Lesson.objects.create(section=s, slug="l", order=0, is_published=True)
    return course


@pytest.mark.django_db
def test_certificate_issued_after_all_lessons_completed(fully_completable_course, learner):
    enroll_user_to_course(user=learner, course=fully_completable_course)
    lesson = fully_completable_course.sections.first().lessons.first()
    mark_lesson_completed(user=learner, lesson=lesson)
    cert = Certificate.objects.filter(user=learner, course=fully_completable_course).first()
    assert cert is not None
    assert cert.certificate_number.startswith("QO-")


@pytest.mark.django_db
def test_certificate_issuance_idempotent(fully_completable_course, learner):
    enroll_user_to_course(user=learner, course=fully_completable_course)
    lesson = fully_completable_course.sections.first().lessons.first()
    mark_lesson_completed(user=learner, lesson=lesson)
    mark_lesson_completed(user=learner, lesson=lesson)
    assert Certificate.objects.filter(user=learner, course=fully_completable_course).count() == 1


@pytest.mark.django_db
def test_certificate_reissue_after_revoke(fully_completable_course, learner):
    from django.utils import timezone
    enroll_user_to_course(user=learner, course=fully_completable_course)
    lesson = fully_completable_course.sections.first().lessons.first()
    mark_lesson_completed(user=learner, lesson=lesson)
    cert = Certificate.objects.get(user=learner, course=fully_completable_course)
    cert.revoked_at = timezone.now()
    cert.save()
    new_cert = issue_certificate_if_eligible(user=learner, course=fully_completable_course)
    assert new_cert is not None
    assert new_cert.pk != cert.pk
