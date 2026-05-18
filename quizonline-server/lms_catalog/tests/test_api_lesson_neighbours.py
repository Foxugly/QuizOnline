"""Tests for the prev_lesson / next_lesson navigation fields on
``LessonDetailSerializer``. Two sections of two lessons each cover
mid-section, section-boundary, and course-boundary cases.
"""

import pytest
from rest_framework.test import APIClient

from lms_catalog.models import Lesson, Section


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def course_with_two_sections(db, course):
    s1 = Section.objects.create(course=course, order=0, is_published=True)
    s2 = Section.objects.create(course=course, order=1, is_published=True)

    def _make(section, order, slug, title):
        lesson = Lesson.objects.create(
            section=section, slug=slug, order=order, is_published=True
        )
        lesson.set_current_language("fr")
        lesson.title = title
        lesson.save()
        return lesson

    s1l1 = _make(s1, 0, "s1l1", "Intro")
    s1l2 = _make(s1, 1, "s1l2", "Setup")
    s2l1 = _make(s2, 0, "s2l1", "Deep dive")
    s2l2 = _make(s2, 1, "s2l2", "Wrap up")
    return {
        "s1l1": s1l1, "s1l2": s1l2,
        "s2l1": s2l1, "s2l2": s2l2,
    }


@pytest.mark.django_db
def test_neighbours_at_course_start(owner, course_with_two_sections):
    """First lesson of the course: prev null, next is the next lesson in same section."""
    resp = _auth(owner).get(f"/api/lms/lesson/{course_with_two_sections['s1l1'].id}/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["prev_lesson"] is None
    assert body["next_lesson"] == {"id": course_with_two_sections["s1l2"].id, "title": "Setup"}


@pytest.mark.django_db
def test_neighbours_at_section_boundary(owner, course_with_two_sections):
    """Last lesson of section 1: next jumps to first lesson of section 2."""
    resp = _auth(owner).get(f"/api/lms/lesson/{course_with_two_sections['s1l2'].id}/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["prev_lesson"]["id"] == course_with_two_sections["s1l1"].id
    assert body["next_lesson"]["id"] == course_with_two_sections["s2l1"].id


@pytest.mark.django_db
def test_neighbours_at_course_end(owner, course_with_two_sections):
    """Last lesson of the course: prev is the previous lesson, next null."""
    resp = _auth(owner).get(f"/api/lms/lesson/{course_with_two_sections['s2l2'].id}/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["prev_lesson"]["id"] == course_with_two_sections["s2l1"].id
    assert body["next_lesson"] is None


@pytest.mark.django_db
def test_neighbours_solo_lesson(owner, course):
    """A course with one lesson exposes both prev and next as null."""
    section = Section.objects.create(course=course, order=0, is_published=True)
    solo = Lesson.objects.create(section=section, slug="solo", order=0, is_published=True)
    resp = _auth(owner).get(f"/api/lms/lesson/{solo.id}/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["prev_lesson"] is None
    assert body["next_lesson"] is None
