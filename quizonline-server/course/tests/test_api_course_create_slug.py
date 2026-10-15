"""Creating a course whose title (or slug) collides with an existing course.

The Angular create page sends its own slugified slug, so the server must
deduplicate a provided slug as well, not only a derived one. A Django
``ValidationError`` raised by ``full_clean()`` must surface as a 400, never
a 500.
"""

import pytest
from rest_framework.test import APIClient


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def _create(client, domain, lang_code="fr", title="Mon Cours", **extra):
    payload = {
        "domain": domain.id,
        "language_code": lang_code,
        "translations": {lang_code: {"title": title}},
        **extra,
    }
    return client.post("/api/v1/course/", payload, format="json")


@pytest.mark.django_db
def test_same_title_twice_gets_suffixed_slug(owner, domain):
    client = _auth(owner)
    first = _create(client, domain, title="Mon Cours", slug="mon-cours")
    second = _create(client, domain, title="Mon Cours", slug="mon-cours")
    assert first.status_code == 201, first.content
    assert second.status_code == 201, second.content
    assert first.json()["slug"] == "mon-cours"
    assert second.json()["slug"] == "mon-cours-2"


@pytest.mark.django_db
def test_same_title_without_slug_twice_gets_suffixed_slug(owner, domain):
    client = _auth(owner)
    assert _create(client, domain, title="Intro").json()["slug"] == "intro"
    assert _create(client, domain, title="Intro").json()["slug"] == "intro-2"


@pytest.mark.django_db
def test_explicit_colliding_slug_is_deduplicated(owner, domain, course):
    # ``course`` fixture already holds slug "c1".
    client = _auth(owner)
    resp = _create(client, domain, title="Autre titre", slug="c1")
    assert resp.status_code == 201, resp.content
    assert resp.json()["slug"] == "c1-2"


@pytest.mark.django_db
def test_explicit_slug_is_slugified(owner, domain):
    client = _auth(owner)
    resp = _create(client, domain, title="X", slug="Mon-Slug")
    assert resp.status_code == 201, resp.content
    assert resp.json()["slug"] == "mon-slug"


@pytest.mark.django_db
def test_invalid_model_value_on_create_returns_400(owner, domain, en_lang):
    # ``en`` exists but is not in the domain's allowed_languages: the model's
    # ``clean()`` rejects it. That must be a 400, not a 500.
    client = _auth(owner)
    resp = _create(client, domain, lang_code="en", title="Course")
    assert resp.status_code == 400, resp.content
    assert "language" in resp.json()


@pytest.mark.django_db
def test_invalid_model_value_on_update_returns_400(owner, course, en_lang):
    client = _auth(owner)
    resp = client.patch(f"/api/v1/course/{course.id}/", {"language_code": "en"}, format="json")
    assert resp.status_code == 400, resp.content
    assert "language" in resp.json()
