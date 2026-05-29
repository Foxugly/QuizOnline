"""View / permission coverage for ``LessonViewSet``.

Before this file the lesson view had only model + serializer tests:
``Lesson.objects.visible_to(user)`` and ``IsLmsInstructorOrReadOnly``
were exercised through other apps (course / block) but never directly
on the lesson endpoint. A regression in either was silently undetected.
"""

import pytest
from rest_framework.test import APIClient

from customuser.models import CustomUser
from lesson.models import Lesson


@pytest.fixture
def published_lesson(db, course, fr_lang):
    """A lesson that ``Lesson.objects.visible_to`` will surface for the
    learner — the parent course is published, and the lesson itself is
    marked published. The section also needs ``is_published=True`` so
    the published-chain holds end to end."""
    course.is_published = True
    course.save()
    # The conftest's ``course`` fixture builds a section under it; the
    # ``lesson`` fixture builds yet another one with its own section.
    # Use the lesson fixture's section so the chain is consistent.
    return _ensure_published_chain(db, course)


def _ensure_published_chain(db, course):
    from course.models import Section
    section = Section.objects.create(course=course, order=10, is_published=True)
    lesson = Lesson.objects.create(
        section=section, slug="published", order=0, is_published=True,
    )
    return lesson


@pytest.fixture
def outsider(db):
    """A user who is not a member of the lesson's domain at all."""
    return CustomUser.objects.create_user(
        username="outsider", email="outsider@x.com", password="x",
    )


@pytest.fixture
def learner(db, domain):
    """A regular learner who has been added to the domain's members
    list — gets read access to published lessons, no write access."""
    u = CustomUser.objects.create_user(
        username="learner", email="learner@x.com", password="x",
    )
    domain.members.add(u)
    return u


@pytest.mark.django_db
def test_lesson_list_rejects_anonymous(published_lesson):
    """Without authentication the lesson list endpoint returns 401."""
    client = APIClient()
    response = client.get("/api/lesson/")
    assert response.status_code == 401


@pytest.mark.django_db
def test_lesson_list_hides_lessons_from_outsider(published_lesson, outsider):
    """An authenticated user who is not a member of the lesson's domain
    sees no lessons via the list endpoint, even when the lesson is
    fully published."""
    client = APIClient()
    client.force_authenticate(user=outsider)
    response = client.get("/api/lesson/")
    assert response.status_code == 200
    payload = response.json()
    results = payload["results"] if isinstance(payload, dict) and "results" in payload else payload
    assert results == [], f"outsider should see no lessons, got: {results!r}"


@pytest.mark.django_db
def test_lesson_retrieve_lets_learner_read_published_lesson(published_lesson, learner):
    """A domain member sees a published lesson via the detail endpoint."""
    client = APIClient()
    client.force_authenticate(user=learner)
    response = client.get(f"/api/lesson/{published_lesson.id}/")
    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == published_lesson.id


@pytest.mark.django_db
def test_lesson_patch_rejects_learner(published_lesson, learner):
    """A domain member cannot edit a lesson — write methods require
    instructor rights (owner / manager / superuser)."""
    client = APIClient()
    client.force_authenticate(user=learner)
    response = client.patch(
        f"/api/lesson/{published_lesson.id}/",
        {"order": 99},
        format="json",
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_lesson_patch_lets_owner_through(published_lesson, owner):
    """The domain owner is an LMS instructor and can edit the lesson."""
    client = APIClient()
    client.force_authenticate(user=owner)
    response = client.patch(
        f"/api/lesson/{published_lesson.id}/",
        {"order": 7},
        format="json",
    )
    assert response.status_code == 200
    published_lesson.refresh_from_db()
    assert published_lesson.order == 7
