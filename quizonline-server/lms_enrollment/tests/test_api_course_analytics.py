"""Tests for the instructor analytics endpoint.

GET /api/lms/course/{id}/analytics/ aggregates KPIs the course-edit
"Analytics" tab consumes. The endpoint is instructor-gated (super
user / owner / manager) so non-instructors must see a 403.
"""

import pytest
from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from customuser.models import CustomUser
from lms_enrollment.models import Certificate, CourseEnrollment, CourseProgress


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def url(course):
    return reverse("api:lms-enrollment-api:course-analytics", args=[course.id])


@pytest.mark.django_db
def test_403_for_non_instructor(course, learner, url):
    resp = _auth(learner).get(url)
    assert resp.status_code == 403


@pytest.mark.django_db
def test_404_when_course_missing(owner):
    resp = _auth(owner).get(reverse("api:lms-enrollment-api:course-analytics", args=[99999]))
    assert resp.status_code == 404


@pytest.mark.django_db
def test_empty_course_returns_zeros(owner, url):
    resp = _auth(owner).get(url)
    assert resp.status_code == 200
    body = resp.json()
    assert body["enrollment_counts"] == {
        "total": 0, "active": 0, "pending": 0, "completed": 0, "cancelled": 0,
    }
    assert body["completion_rate_pct"] == 0
    assert body["last_enrolled_at"] is None
    assert body["last_completed_at"] is None
    assert body["median_progress_pct"] == 0
    assert body["certificates_issued"] == 0
    assert len(body["enrollment_trend_30d"]) == 30
    assert all(row["count"] == 0 for row in body["enrollment_trend_30d"])


@pytest.mark.django_db
def test_enrollment_counts_and_completion_rate(owner, course, url):
    # 4 active, 1 completed, 2 cancelled, 1 pending
    for i in range(4):
        u = CustomUser.objects.create_user(username=f"a{i}", password="x")
        CourseEnrollment.objects.create(user=u, course=course, status=CourseEnrollment.STATUS_ACTIVE)
    u_done = CustomUser.objects.create_user(username="done", password="x")
    CourseEnrollment.objects.create(
        user=u_done, course=course, status=CourseEnrollment.STATUS_COMPLETED,
        completed_at=timezone.now(),
    )
    for i in range(2):
        u = CustomUser.objects.create_user(username=f"c{i}", password="x")
        CourseEnrollment.objects.create(user=u, course=course, status=CourseEnrollment.STATUS_CANCELLED)
    u_pending = CustomUser.objects.create_user(username="p", password="x")
    CourseEnrollment.objects.create(user=u_pending, course=course, status=CourseEnrollment.STATUS_PENDING)

    body = _auth(owner).get(url).json()
    assert body["enrollment_counts"] == {
        "total": 8, "active": 4, "pending": 1, "completed": 1, "cancelled": 2,
    }
    # completion_rate excludes pending + cancelled: 1 / (4 + 1) = 20%
    assert body["completion_rate_pct"] == 20


@pytest.mark.django_db
def test_median_progress_only_counts_non_cancelled(owner, course, url):
    progress_values = [0, 25, 50, 75, 100]
    for i, pct in enumerate(progress_values):
        u = CustomUser.objects.create_user(username=f"u{i}", password="x")
        CourseEnrollment.objects.create(user=u, course=course, status=CourseEnrollment.STATUS_ACTIVE)
        CourseProgress.objects.create(user=u, course=course, progress_percent=pct)
    # A cancelled enrollee with 0% should not drag the median down.
    cancelled = CustomUser.objects.create_user(username="cancelled", password="x")
    CourseEnrollment.objects.create(user=cancelled, course=course, status=CourseEnrollment.STATUS_CANCELLED)
    CourseProgress.objects.create(user=cancelled, course=course, progress_percent=0)

    body = _auth(owner).get(url).json()
    assert body["median_progress_pct"] == 50


@pytest.mark.django_db
def test_certificates_count_excludes_revoked(owner, course, url):
    learner1 = CustomUser.objects.create_user(username="l1", password="x")
    learner2 = CustomUser.objects.create_user(username="l2", password="x")
    Certificate.objects.create(
        user=learner1, course=course, certificate_number="LMS-2026-001",
        verification_token="t1",
    )
    Certificate.objects.create(
        user=learner2, course=course, certificate_number="LMS-2026-002",
        verification_token="t2",
        revoked_at=timezone.now(),
    )

    body = _auth(owner).get(url).json()
    assert body["certificates_issued"] == 1


@pytest.mark.django_db
def test_enrollment_trend_30d_buckets(owner, course, url):
    now = timezone.now()
    offsets = [0, 0, 1, 14, 29, 40]  # 40 is older than the window
    for i, offset in enumerate(offsets):
        u = CustomUser.objects.create_user(username=f"trend-{i}-{offset}", password="x")
        CourseEnrollment.objects.create(user=u, course=course)
        # Backdate enrolled_at — auto_now_add prevents the constructor path,
        # so we rewrite after the fact.
        CourseEnrollment.objects.filter(user=u, course=course).update(
            enrolled_at=now - timedelta(days=offset)
        )

    body = _auth(owner).get(url).json()
    trend = body["enrollment_trend_30d"]
    assert len(trend) == 30
    today_iso = timezone.localdate().isoformat()
    today_bucket = next(row for row in trend if row["date"] == today_iso)
    assert today_bucket["count"] >= 2  # both offset=0 enrollments
    # The 40-day-old enrollment falls outside the window
    total_in_window = sum(row["count"] for row in trend)
    assert total_in_window == 5  # 2 + 1 + 1 + 1
