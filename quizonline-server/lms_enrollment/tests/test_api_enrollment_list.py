"""End-to-end tests for ``GET /api/lms/enrollment/`` — verifies the
instructor-aware ``?course=<id>`` filter introduced for the Angular
enrollment-tab on ``/lms/course/:id/edit`` plus the ``?status=<value>``
narrowing helper."""

import pytest
from rest_framework.test import APIClient

from customuser.models import CustomUser
from lms_enrollment.models import CourseEnrollment


def _enroll(user, course, status=CourseEnrollment.STATUS_ACTIVE) -> CourseEnrollment:
    return CourseEnrollment.objects.create(user=user, course=course, status=status)


def _rows(resp) -> list:
    """Return the list of rows from a paginated or unpaginated DRF list response."""
    data = resp.json()
    if isinstance(data, dict) and "results" in data:
        return data["results"]
    return data


@pytest.fixture
def three_learners(db, domain):
    users = []
    for i in range(3):
        u = CustomUser.objects.create_user(
            username=f"learner{i}", email=f"learner{i}@ex.com", password="x"
        )
        domain.members.add(u)
        users.append(u)
    return users


@pytest.mark.django_db
def test_instructor_sees_all_enrollments_for_their_course(course, owner, three_learners):
    """Course owner GET /api/lms/enrollment/?course=<id> → every enrollment row."""
    for learner in three_learners:
        _enroll(learner, course)

    client = APIClient()
    client.force_authenticate(user=owner)
    resp = client.get(f"/api/lms/enrollment/?course={course.id}")

    assert resp.status_code == 200
    rows = _rows(resp)
    assert len(rows) == 3
    # Each row carries the enriched user_detail so the table can show username/email
    # without an extra fetch.
    for row in rows:
        assert "user_detail" in row
        assert row["user_detail"] is not None
        assert "username" in row["user_detail"]
        assert "email" in row["user_detail"]


@pytest.mark.django_db
def test_non_instructor_sees_only_own_enrollment_when_scoped_to_course(
    course, three_learners
):
    """A learner who is not an instructor of the course only sees their own row,
    even when the request is scoped to ``?course=<id>``."""
    for learner in three_learners:
        _enroll(learner, course)

    me = three_learners[0]
    client = APIClient()
    client.force_authenticate(user=me)
    resp = client.get(f"/api/lms/enrollment/?course={course.id}")

    assert resp.status_code == 200
    rows = _rows(resp)
    assert len(rows) == 1
    assert rows[0]["user"] == me.id


@pytest.mark.django_db
def test_status_filter_narrows_results_for_instructor(course, owner, three_learners):
    """``?status=pending`` returns only enrollments matching that status."""
    pending_learner = three_learners[0]
    _enroll(pending_learner, course, status=CourseEnrollment.STATUS_PENDING)
    for learner in three_learners[1:]:
        _enroll(learner, course)  # default = ACTIVE

    client = APIClient()
    client.force_authenticate(user=owner)
    resp = client.get(
        f"/api/lms/enrollment/?course={course.id}&status=pending"
    )

    assert resp.status_code == 200
    rows = _rows(resp)
    assert len(rows) == 1
    assert rows[0]["user"] == pending_learner.id
    assert rows[0]["status"] == CourseEnrollment.STATUS_PENDING


@pytest.mark.django_db
def test_invalid_course_filter_returns_empty(course, owner):
    """Garbage ``?course=`` value yields a 200 + empty list, never a 500."""
    client = APIClient()
    client.force_authenticate(user=owner)
    resp = client.get("/api/lms/enrollment/?course=not-a-number")

    assert resp.status_code == 200
    assert _rows(resp) == []


@pytest.mark.django_db
def test_unscoped_request_still_returns_own_enrollments(course, three_learners):
    """Backward-compat: with no ``?course=`` the member-view (own enrollments
    only) keeps working — guards against the widening accidentally exposing
    other users' rows on the plain ``/api/lms/enrollment/`` endpoint."""
    for learner in three_learners:
        _enroll(learner, course)

    me = three_learners[0]
    client = APIClient()
    client.force_authenticate(user=me)
    resp = client.get("/api/lms/enrollment/")

    assert resp.status_code == 200
    rows = _rows(resp)
    assert len(rows) == 1
    assert rows[0]["user"] == me.id
