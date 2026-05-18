"""Tests for the private per-learner lesson notes endpoint.

GET /api/lms/lesson/{id}/note/  → returns the caller's note or an
                                  empty one if no note exists yet.
PUT /api/lms/lesson/{id}/note/  → upserts the content.

Notes are strictly private: a learner only ever reads/writes their
own row.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from customuser.models import CustomUser
from lms_enrollment.models import LessonNote


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def url(lesson):
    return reverse("api:lms-enrollment-api:lesson-note", args=[lesson.id])


@pytest.mark.django_db
def test_get_creates_empty_note_on_first_read(owner, url, lesson):
    resp = _auth(owner).get(url)
    assert resp.status_code == 200
    body = resp.json()
    assert body["content"] == ""
    assert body["lesson"] == lesson.id
    # The fetch path is idempotent: the row exists now and subsequent
    # reads return the same one.
    assert LessonNote.objects.filter(user=owner, lesson=lesson).count() == 1


@pytest.mark.django_db
def test_put_saves_content(owner, url):
    resp = _auth(owner).put(url, {"content": "Quill notes here"}, format="json")
    assert resp.status_code == 200
    assert resp.json()["content"] == "Quill notes here"


@pytest.mark.django_db
def test_put_overwrites_existing_content(owner, url):
    _auth(owner).put(url, {"content": "First"}, format="json")
    resp = _auth(owner).put(url, {"content": "Second"}, format="json")
    assert resp.json()["content"] == "Second"


@pytest.mark.django_db
def test_put_rejects_non_string_content(owner, url):
    resp = _auth(owner).put(url, {"content": 123}, format="json")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_notes_are_private_per_user(owner, url, lesson):
    other = CustomUser.objects.create_user(username="other-learner", password="x")
    _auth(owner).put(url, {"content": "Owner's note"}, format="json")
    _auth(other).put(url, {"content": "Other's note"}, format="json")
    # Each user sees only their own row.
    owner_resp = _auth(owner).get(url)
    other_resp = _auth(other).get(url)
    assert owner_resp.json()["content"] == "Owner's note"
    assert other_resp.json()["content"] == "Other's note"


@pytest.mark.django_db
def test_unauthenticated_is_401(url):
    resp = APIClient().get(url)
    assert resp.status_code in (401, 403)


@pytest.mark.django_db
def test_404_on_missing_lesson(owner):
    resp = _auth(owner).get(reverse("api:lms-enrollment-api:lesson-note", args=[99999]))
    assert resp.status_code == 404
