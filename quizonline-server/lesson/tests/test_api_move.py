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


@pytest.mark.django_db
def test_target_section_in_other_course_is_400(owner, domain, fr_lang, setup):
    from course.models import Course

    s1, _s2, lesson = setup
    other = Course(domain=domain, slug="c2", language=fr_lang, level=Course.LEVEL_BEGINNER)
    other.set_current_language("fr")
    other.title = "C2"
    other.save()
    foreign = Section.objects.create(course=other, order=0)
    resp = _auth(owner).post(f"/api/v1/lesson/{lesson.id}/move/", {"section": foreign.id, "position": 0}, format="json")
    assert resp.status_code == 400
    lesson.refresh_from_db()
    assert (lesson.section_id, lesson.order) == (s1.id, 0)


@pytest.mark.django_db
def test_unknown_section_is_400(owner, setup):
    s1, _s2, lesson = setup
    resp = _auth(owner).post(f"/api/v1/lesson/{lesson.id}/move/", {"section": 999999, "position": 0}, format="json")
    assert resp.status_code == 400
    lesson.refresh_from_db()
    assert lesson.section_id == s1.id


@pytest.mark.django_db
def test_user_without_membership_gets_404(setup):
    _s1, s2, lesson = setup
    stranger = CustomUser.objects.create_user(email="stranger@example.test", password="x")
    resp = _auth(stranger).post(f"/api/v1/lesson/{lesson.id}/move/", {"section": s2.id, "position": 0}, format="json")
    assert resp.status_code == 404
    lesson.refresh_from_db()
    assert lesson.section_id != s2.id


@pytest.mark.django_db
def test_member_of_other_domain_gets_404(setup, fr_lang):
    from domain.models import Domain

    _s1, s2, lesson = setup
    other_owner = CustomUser.objects.create_user(email="other-owner@example.test", password="x")
    other_domain = Domain.objects.create(owner=other_owner)
    other_domain.set_current_language("fr")
    other_domain.name = "Other Domain"
    other_domain.save()
    other_domain.allowed_languages.add(fr_lang)
    stranger = CustomUser.objects.create_user(email="stranger2@example.test", password="x")
    other_domain.members.add(stranger)
    resp = _auth(stranger).post(f"/api/v1/lesson/{lesson.id}/move/", {"section": s2.id, "position": 0}, format="json")
    assert resp.status_code == 404
    lesson.refresh_from_db()
    assert lesson.section_id != s2.id

@pytest.mark.django_db
@pytest.mark.parametrize("position,expected", [(1, ["x", "l", "y"]), (99, ["x", "y", "l"])])
def test_position_ordering_in_target(owner, setup, position, expected):
    _s1, s2, lesson = setup
    Lesson.objects.create(section=s2, slug="x", order=0)
    Lesson.objects.create(section=s2, slug="y", order=1)
    resp = _auth(owner).post(f"/api/v1/lesson/{lesson.id}/move/", {"section": s2.id, "position": position}, format="json")
    assert resp.status_code == 200, resp.content
    assert [x["slug"] for x in resp.json()["target_section"]["lessons"]] == expected
