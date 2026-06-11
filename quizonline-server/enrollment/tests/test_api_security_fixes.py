"""Regression tests for two enrollment-side hardening fixes:

* ``course_invite_send`` must gate on instructor rights BEFORE resolving the
  invitee, so a non-instructor cannot use the 404-vs-403 difference as a
  user-existence oracle.
* ``CourseEnrollmentViewSet.cancel`` must refuse to clobber a terminal
  (COMPLETED) enrollment.
"""

from __future__ import annotations

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from course.models import Course
from enrollment.models import CourseEnrollment


@pytest.fixture
def invite_course(course):
    course.enrollment_mode = Course.ENROLL_INVITE
    course.is_published = True
    course.save()
    return course


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.mark.django_db
def test_invite_send_non_instructor_403_regardless_of_invitee_existence(
    invite_course, learner
):
    # A non-instructor (learner) must get 403 whether the invitee_id is a
    # real user or a non-existent one — no 404-vs-403 existence oracle.
    url = reverse(
        "api:enrollment-api:course-invite-send",
        kwargs={"course_id": invite_course.id},
    )
    client = _auth(learner)

    resp_real = client.post(url, {"invitee_id": learner.id}, format="json")
    resp_missing = client.post(url, {"invitee_id": 999999}, format="json")

    assert resp_real.status_code == 403
    assert resp_missing.status_code == 403


@pytest.mark.django_db
def test_cancel_completed_enrollment_is_rejected(course, learner):
    enrollment = CourseEnrollment.objects.create(
        user=learner,
        course=course,
        status=CourseEnrollment.STATUS_COMPLETED,
        completed_at=timezone.now(),
    )
    url = reverse("api:enrollment-api:enrollment-cancel", kwargs={"pk": enrollment.id})
    resp = _auth(learner).post(url, {}, format="json")

    assert resp.status_code == 409
    enrollment.refresh_from_db()
    # The COMPLETED status must NOT have been silently overwritten.
    assert enrollment.status == CourseEnrollment.STATUS_COMPLETED
    assert enrollment.completed_at is not None


@pytest.mark.django_db
def test_cancel_active_enrollment_still_works(course, learner):
    enrollment = CourseEnrollment.objects.create(
        user=learner, course=course, status=CourseEnrollment.STATUS_ACTIVE,
    )
    url = reverse("api:enrollment-api:enrollment-cancel", kwargs={"pk": enrollment.id})
    resp = _auth(learner).post(url, {}, format="json")

    assert resp.status_code == 200
    enrollment.refresh_from_db()
    assert enrollment.status == CourseEnrollment.STATUS_CANCELLED
