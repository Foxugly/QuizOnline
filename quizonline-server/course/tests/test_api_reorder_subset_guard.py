"""A strict SUBSET of section/lesson ids passed to the reorder actions used to
pass ``two_phase_reorder``'s ``len(rows) == len(ids)`` guard and then collide
on the ``(course, order)`` / ``(section, order)`` unique constraint, surfacing
as a 500. The actions now validate ``set(ids) == set(all ids)`` and return 400.
"""

import pytest
from rest_framework.test import APIClient

from course.models import Section
from lesson.models import Lesson


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.mark.django_db
def test_section_reorder_subset_returns_400(course, owner):
    s1 = Section.objects.create(course=course, order=0)
    Section.objects.create(course=course, order=1)
    # Only one of the two section ids -> strict subset.
    resp = _auth(owner).post(
        f"/api/course/{course.id}/section/reorder/", {"ids": [s1.id]}, format="json"
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_section_reorder_full_set_succeeds(course, owner):
    s1 = Section.objects.create(course=course, order=0)
    s2 = Section.objects.create(course=course, order=1)
    resp = _auth(owner).post(
        f"/api/course/{course.id}/section/reorder/",
        {"ids": [s2.id, s1.id]},
        format="json",
    )
    assert resp.status_code == 200
    s1.refresh_from_db()
    s2.refresh_from_db()
    assert (s1.order, s2.order) == (1, 0)


@pytest.mark.django_db
def test_lesson_reorder_subset_returns_400(course, owner):
    section = Section.objects.create(course=course, order=0)
    l1 = Lesson.objects.create(section=section, slug="a", order=0)
    Lesson.objects.create(section=section, slug="b", order=1)
    resp = _auth(owner).post(
        f"/api/section/{section.id}/lesson/reorder/", {"ids": [l1.id]}, format="json"
    )
    assert resp.status_code == 400
