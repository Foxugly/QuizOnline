import pytest
from django.core.exceptions import PermissionDenied

from lms_catalog.models import Course
from lms_enrollment.models import CourseEnrollment
from lms_enrollment.services import (
    approve_enrollment,
    enroll_user_to_course,
    reject_enrollment,
)


@pytest.mark.django_db
def test_enroll_open_creates_active(course, learner):
    course.enrollment_mode = Course.ENROLL_OPEN
    course.save()
    e = enroll_user_to_course(user=learner, course=course)
    assert e.status == CourseEnrollment.STATUS_ACTIVE


@pytest.mark.django_db
def test_enroll_approval_creates_pending(course, learner):
    course.enrollment_mode = Course.ENROLL_APPROVAL
    course.save()
    e = enroll_user_to_course(user=learner, course=course)
    assert e.status == CourseEnrollment.STATUS_PENDING


@pytest.mark.django_db
def test_enroll_invite_blocks_self_signup(course, learner):
    course.enrollment_mode = Course.ENROLL_INVITE
    course.save()
    with pytest.raises(PermissionDenied):
        enroll_user_to_course(user=learner, course=course)


@pytest.mark.django_db
def test_enroll_invite_allows_instructor_to_add(course, learner, owner):
    course.enrollment_mode = Course.ENROLL_INVITE
    course.save()
    e = enroll_user_to_course(user=learner, course=course, requested_by=owner)
    assert e.status == CourseEnrollment.STATUS_ACTIVE


@pytest.mark.django_db
def test_enroll_is_idempotent(course, learner):
    e1 = enroll_user_to_course(user=learner, course=course)
    e2 = enroll_user_to_course(user=learner, course=course)
    assert e1.pk == e2.pk


@pytest.mark.django_db
def test_approve_enrollment_flips_to_active(course, learner, owner):
    course.enrollment_mode = Course.ENROLL_APPROVAL
    course.save()
    e = enroll_user_to_course(user=learner, course=course)
    approve_enrollment(enrollment=e, decided_by=owner)
    e.refresh_from_db()
    assert e.status == CourseEnrollment.STATUS_ACTIVE


@pytest.mark.django_db
def test_approve_enrollment_rejects_non_instructor(course, learner):
    from customuser.models import CustomUser
    intruder = CustomUser.objects.create_user(username="intr", email="intr@x.com", password="x")
    course.enrollment_mode = Course.ENROLL_APPROVAL
    course.save()
    e = enroll_user_to_course(user=learner, course=course)
    with pytest.raises(PermissionDenied):
        approve_enrollment(enrollment=e, decided_by=intruder)


@pytest.mark.django_db
def test_reject_enrollment_marks_cancelled(course, learner, owner):
    course.enrollment_mode = Course.ENROLL_APPROVAL
    course.save()
    e = enroll_user_to_course(user=learner, course=course)
    reject_enrollment(enrollment=e, decided_by=owner)
    e.refresh_from_db()
    assert e.status == CourseEnrollment.STATUS_CANCELLED
