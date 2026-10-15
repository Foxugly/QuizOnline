import pytest
from rest_framework.test import APIClient

from course.models import Section
from customuser.models import CustomUser
from lesson.models import Lesson


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def setup(course):
    s1 = Section.objects.create(course=course, order=0)
    s2 = Section.objects.create(course=course, order=1)
    lesson = Lesson.objects.create(section=s1, slug="l", order=0)
    return s1, s2, lesson


@pytest.mark.django_db
def test_owner_moves_lesson(owner, setup):
    s1, s2, lesson = setup
    resp = _auth(owner).post(f"/api/v1/lesson/{lesson.id}/move/", {"section": s2.id, "position": 0}, format="json")
    assert resp.status_code == 200, resp.content
    body = resp.json()
    assert body["lesson"]["section"] == s2.id
    assert body["source_section"]["id"] == s1.id and body["source_section"]["lessons"] == []
    assert [x["id"] for x in body["target_section"]["lessons"]] == [lesson.id]


@pytest.mark.django_db
def test_member_cannot_move(course, setup):
    _s1, s2, lesson = setup
    member = CustomUser.objects.create_user(email="m@example.test", password="x")
    course.domain.members.add(member)
    resp = _auth(member).post(f"/api/v1/lesson/{lesson.id}/move/", {"section": s2.id, "position": 0}, format="json")
    assert resp.status_code in (403, 404)
    lesson.refresh_from_db()
    assert lesson.section_id != s2.id


@pytest.mark.django_db
def test_negative_position_is_400(owner, setup):
    _s1, s2, lesson = setup
    resp = _auth(owner).post(f"/api/v1/lesson/{lesson.id}/move/", {"section": s2.id, "position": -1}, format="json")
    assert resp.status_code == 400
