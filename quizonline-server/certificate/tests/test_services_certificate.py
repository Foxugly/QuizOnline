import pytest

from course.models import Section
from lesson.models import Lesson
from certificate.models import Certificate
from certificate.services import issue_certificate_if_eligible
from enrollment.services import (
    enroll_user_to_course,
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


@pytest.mark.django_db
def test_certificate_skipped_when_course_opted_out(fully_completable_course, learner):
    """Courses with ``issues_certificate=False`` complete normally but
    do not produce a certificate row."""
    fully_completable_course.issues_certificate = False
    fully_completable_course.save(update_fields=["issues_certificate"])
    enroll_user_to_course(user=learner, course=fully_completable_course)
    lesson = fully_completable_course.sections.first().lessons.first()
    mark_lesson_completed(user=learner, lesson=lesson)
    assert not Certificate.objects.filter(
        user=learner, course=fully_completable_course
    ).exists()


@pytest.mark.django_db
def test_certificate_expires_at_set_from_validity_months(fully_completable_course, learner):
    """``Certificate.expires_at`` is computed at issue time from the
    course's ``certificate_validity_months`` policy."""
    from datetime import timedelta
    fully_completable_course.certificate_validity_months = 12
    fully_completable_course.save(update_fields=["certificate_validity_months"])
    enroll_user_to_course(user=learner, course=fully_completable_course)
    lesson = fully_completable_course.sections.first().lessons.first()
    mark_lesson_completed(user=learner, lesson=lesson)
    cert = Certificate.objects.get(user=learner, course=fully_completable_course)
    assert cert.expires_at is not None
    # ~1 year ahead, ±1 day tolerance for relativedelta calendar math.
    delta = cert.expires_at - cert.issued_at
    assert timedelta(days=364) <= delta <= timedelta(days=367)


@pytest.mark.django_db
def test_certificate_no_expiration_by_default(fully_completable_course, learner):
    """``validity_months=0`` (default) keeps ``expires_at`` null —
    preserves legacy behaviour for every existing course."""
    enroll_user_to_course(user=learner, course=fully_completable_course)
    lesson = fully_completable_course.sections.first().lessons.first()
    mark_lesson_completed(user=learner, lesson=lesson)
    cert = Certificate.objects.get(user=learner, course=fully_completable_course)
    assert cert.expires_at is None
