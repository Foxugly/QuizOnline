"""Creating sections and lessons: the server picks the position and the
slug, so a course whose orders are not exactly 0..N-1 (a JSON import) or
two lessons with the same title no longer fail with a raw 400."""

import pytest
from rest_framework.test import APIClient

from course.models import Section
from lesson.models import Lesson


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def _create_section(client, course, title="S", **extra):
    payload = {"course": course.id, "translations": {"fr": {"title": title}}, **extra}
    return client.post("/api/v1/section/", payload, format="json")


def _create_lesson(client, section, title="L", **extra):
    payload = {"section": section.id, "translations": {"fr": {"title": title}}, **extra}
    return client.post("/api/v1/lesson/", payload, format="json")


@pytest.mark.django_db
def test_section_appended_after_gapped_orders(owner, course):
    # Orders 1, 2, 3 — what an import can leave. The old front sent
    # ``order = len(sections) = 3`` and hit UNIQUE(course, order).
    for order in (1, 2, 3):
        Section.objects.create(course=course, order=order)
    resp = _create_section(_auth(owner), course)
    assert resp.status_code == 201, resp.content
    assert resp.json()["order"] == 4


@pytest.mark.django_db
def test_section_client_order_is_ignored(owner, course):
    Section.objects.create(course=course, order=0)
    resp = _create_section(_auth(owner), course, order=0)
    assert resp.status_code == 201, resp.content
    assert resp.json()["order"] == 1


@pytest.mark.django_db
def test_first_section_gets_order_zero(owner, course):
    resp = _create_section(_auth(owner), course)
    assert resp.status_code == 201
    assert resp.json()["order"] == 0


@pytest.mark.django_db
def test_lesson_appended_and_slug_derived(owner, section):
    Lesson.objects.create(section=section, slug="a", order=5)
    resp = _create_lesson(_auth(owner), section, title="Mise en route")
    assert resp.status_code == 201, resp.content
    body = resp.json()
    assert body["order"] == 6
    assert body["slug"] == "mise-en-route"


@pytest.mark.django_db
def test_same_title_twice_gets_suffixed_slug(owner, section):
    client = _auth(owner)
    first = _create_lesson(client, section, title="Introduction")
    second = _create_lesson(client, section, title="Introduction")
    third = _create_lesson(client, section, title="Introduction")
    assert [r.status_code for r in (first, second, third)] == [201, 201, 201]
    assert [r.json()["slug"] for r in (first, second, third)] == [
        "introduction", "introduction-2", "introduction-3",
    ]


@pytest.mark.django_db
def test_explicit_colliding_slug_is_deduplicated(owner, section):
    Lesson.objects.create(section=section, slug="intro", order=0)
    resp = _create_lesson(_auth(owner), section, title="Autre", slug="intro")
    assert resp.status_code == 201, resp.content
    assert resp.json()["slug"] == "intro-2"


@pytest.mark.django_db
def test_unsluggable_title_falls_back(owner, section):
    resp = _create_lesson(_auth(owner), section, title="???")
    assert resp.status_code == 201, resp.content
    assert resp.json()["slug"] == "lesson"


@pytest.mark.django_db
def test_same_slug_allowed_in_another_section(owner, course):
    s1 = Section.objects.create(course=course, order=0)
    s2 = Section.objects.create(course=course, order=1)
    client = _auth(owner)
    assert _create_lesson(client, s1, title="Intro").json()["slug"] == "intro"
    assert _create_lesson(client, s2, title="Intro").json()["slug"] == "intro"


@pytest.mark.django_db
def test_course_structure_has_no_blocks(owner, course, section):
    Lesson.objects.create(section=section, slug="l", order=0)
    body = _auth(owner).get(f"/api/v1/course/{course.id}/").json()
    lesson = body["sections"][0]["lessons"][0]
    assert "blocks" not in lesson
    assert {"id", "order", "is_published", "is_preview", "translations"} <= set(lesson)


@pytest.mark.django_db
def test_course_retrieve_query_count_does_not_grow(owner, course, django_assert_max_num_queries):
    client = _auth(owner)
    for s_order in range(3):
        section = Section.objects.create(course=course, order=s_order)
        for l_order in range(4):
            Lesson.objects.create(section=section, slug=f"l{s_order}-{l_order}", order=l_order)
    # Baseline measured on 3 sections x 4 lessons; a per-lesson query
    # would add at least 12.
    with django_assert_max_num_queries(40):
        assert client.get(f"/api/v1/course/{course.id}/").status_code == 200


@pytest.mark.django_db
def test_patch_to_taken_order_is_400_not_500(owner, course):
    Section.objects.create(course=course, order=0)
    other = Section.objects.create(course=course, order=1)
    resp = _auth(owner).patch(f"/api/v1/section/{other.id}/", {"order": 0}, format="json")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_patch_lesson_to_taken_slug_is_400_not_500(owner, section):
    Lesson.objects.create(section=section, slug="taken", order=0)
    other = Lesson.objects.create(section=section, slug="free", order=1)
    resp = _auth(owner).patch(f"/api/v1/lesson/{other.id}/", {"slug": "taken"}, format="json")
    assert resp.status_code == 400
