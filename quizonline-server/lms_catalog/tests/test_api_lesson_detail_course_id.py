"""Pin the ``course_id`` field exposed by ``LessonDetailSerializer``.

The lesson-author shell uses this field to render a "Back to parent
course" affordance without a second round-trip through the section
endpoint. Keeping the field in the contract via a dedicated test
prevents an accidental drop during a future serializer refactor.
"""

import pytest
from rest_framework.test import APIClient

from lms_catalog.models import Lesson, Section


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.mark.django_db
def test_lesson_detail_exposes_parent_course_id(course, owner):
    section = Section.objects.create(course=course, order=0, is_published=True)
    lesson = Lesson.objects.create(section=section, slug="l-back", order=0, is_published=True)
    r = _auth(owner).get(f"/api/lms/lesson/{lesson.id}/")
    assert r.status_code == 200, r.content
    assert r.data["course_id"] == course.id


@pytest.mark.django_db
def test_lesson_detail_course_id_is_read_only(course, owner):
    section = Section.objects.create(course=course, order=0, is_published=True)
    lesson = Lesson.objects.create(section=section, slug="l-ro", order=0, is_published=True)
    # Posting a different ``course_id`` must be silently ignored — it is
    # a read-only ``SerializerMethodField``.
    r = _auth(owner).patch(
        f"/api/lms/lesson/{lesson.id}/",
        {"course_id": 9999},
        format="json",
    )
    assert r.status_code == 200, r.content
    assert r.data["course_id"] == course.id
