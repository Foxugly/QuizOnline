"""Tests for the per-course audit log (recording + read endpoint).

publish / unpublish / clone services append a row to ``CourseAuditLog``.
``GET /api/lms/course/{id}/audit-log/`` is instructor-gated and
returns the rows in reverse-chronological order (most recent first).
"""

import pytest
from rest_framework.test import APIClient

from customuser.models import CustomUser
from course.models import CourseAuditLog, Section
from lesson.models import Lesson
from course.services import clone_course, publish_course, unpublish_course


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def publishable_course(db, course):
    """A course with one published lesson so publish_course() does
    not raise on the "no content" guard."""
    s = Section.objects.create(course=course, order=0, is_published=True)
    Lesson.objects.create(section=s, slug="l1-pub", order=0, is_published=True)
    return course


@pytest.mark.django_db
def test_publish_records_audit_row(owner, publishable_course):
    publish_course(course=publishable_course, by_user=owner)
    rows = CourseAuditLog.objects.filter(course=publishable_course)
    assert rows.count() == 1
    row = rows.first()
    assert row.action == "course.publish"
    assert row.actor_id == owner.id


@pytest.mark.django_db
def test_unpublish_records_audit_row(owner, publishable_course):
    publish_course(course=publishable_course, by_user=owner)
    unpublish_course(course=publishable_course, by_user=owner)
    actions = list(
        CourseAuditLog.objects.filter(course=publishable_course)
        .order_by("created_at")
        .values_list("action", flat=True)
    )
    assert actions == ["course.publish", "course.unpublish"]


@pytest.mark.django_db
def test_clone_records_audit_row_with_source_metadata(owner, publishable_course):
    new = clone_course(source=publishable_course, by_user=owner)
    rows = CourseAuditLog.objects.filter(course=new)
    assert rows.count() == 1
    row = rows.first()
    assert row.action == "course.clone"
    assert row.metadata["source_course_id"] == publishable_course.id


@pytest.mark.django_db
def test_audit_log_endpoint_returns_rows_for_instructor(owner, publishable_course):
    publish_course(course=publishable_course, by_user=owner)
    resp = _auth(owner).get(f"/api/lms/course/{publishable_course.id}/audit-log/")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["action"] == "course.publish"
    assert body[0]["actor_username"] == owner.username


@pytest.mark.django_db
def test_audit_log_endpoint_is_instructor_gated(publishable_course, db):
    stranger = CustomUser.objects.create_user(username="stranger", password="x")
    resp = _auth(stranger).get(f"/api/lms/course/{publishable_course.id}/audit-log/")
    # Stranger isn't a domain member at all → catalog visibility filter
    # turns the course into a 404 before the instructor check fires.
    # Either 403 (instructor check) or 404 (visibility) is acceptable.
    assert resp.status_code in (403, 404)