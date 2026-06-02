"""Audited publish / unpublish for lessons.

Lessons used to flip ``is_published`` through a plain PATCH with no
audit trail. The dedicated ``POST /api/lesson/{id}/publish|unpublish/``
actions bring parity with the course-level audited actions: the mutation
is recorded on the parent course's ``CourseAuditLog``
(``lesson.section.course``).
"""

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from course.models import CourseAuditLog, Section
from customuser.models import CustomUser
from lesson.models import Lesson


@pytest.fixture
def member(db, domain):
    """A plain domain member — read access only, no instructor rights."""
    u = CustomUser.objects.create_user(
        username="member", email="member@x.com", password="x",
    )
    domain.members.add(u)
    return u


@pytest.mark.django_db
def test_publish_lesson_audits_on_parent_course(course, owner):
    section = Section.objects.create(course=course, order=0)
    lesson = Lesson.objects.create(
        section=section, slug="l1", order=0, is_published=False,
    )
    client = APIClient()
    client.force_authenticate(user=owner)

    response = client.post(f"/api/lesson/{lesson.id}/publish/")

    assert response.status_code == 200
    lesson.refresh_from_db()
    assert lesson.is_published is True
    assert CourseAuditLog.objects.filter(
        course=course, action="lesson.publish",
    ).exists()


@pytest.mark.django_db
def test_unpublish_lesson_audits_on_parent_course(course, owner):
    section = Section.objects.create(course=course, order=0)
    lesson = Lesson.objects.create(
        section=section, slug="l1", order=0, is_published=True,
    )
    client = APIClient()
    client.force_authenticate(user=owner)

    response = client.post(f"/api/lesson/{lesson.id}/unpublish/")

    assert response.status_code == 200
    lesson.refresh_from_db()
    assert lesson.is_published is False
    assert CourseAuditLog.objects.filter(
        course=course, action="lesson.unpublish",
    ).exists()


@pytest.mark.django_db
def test_unpublish_lesson_rejects_non_instructor(course, member):
    # The lesson must be visible to the member (published chain) so the
    # request reaches the instructor-only write gate and is rejected with
    # 403 rather than hidden behind a 404.
    course.is_published = True
    course.published_at = timezone.now()
    course.save()
    section = Section.objects.create(course=course, order=0, is_published=True)
    lesson = Lesson.objects.create(
        section=section, slug="l1", order=0, is_published=True,
    )
    client = APIClient()
    client.force_authenticate(user=member)

    response = client.post(f"/api/lesson/{lesson.id}/unpublish/")

    assert response.status_code == 403
    lesson.refresh_from_db()
    assert lesson.is_published is True
    assert not CourseAuditLog.objects.filter(course=course).exists()
