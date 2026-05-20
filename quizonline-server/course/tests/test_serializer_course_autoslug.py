"""Tests for the auto-slugify behaviour on ``CourseWriteSerializer.create``.

The frontend course-create form does not always include a ``slug`` —
the backend is the canonical source for it now. The serializer
derives the slug from the primary-language title with ``slugify`` and
appends a numeric suffix on collisions. Edits never auto-rename the
slug (URL stability) so this fixture only exercises the create path.
"""

import pytest
from rest_framework.test import APIRequestFactory

from course.models import Course
from course.serializers import CourseWriteSerializer


def _make(domain, fr_lang, translations, slug=None):
    """Build a serializer payload and instantiate a Course through it."""
    payload = {
        "domain": domain.id,
        "language_code": fr_lang.code,
        "translations": translations,
    }
    if slug is not None:
        payload["slug"] = slug
    request = APIRequestFactory().post("/api/course/", payload, format="json")
    ser = CourseWriteSerializer(data=payload, context={"request": request})
    assert ser.is_valid(), ser.errors
    return ser.save()


@pytest.mark.django_db
def test_create_derives_slug_from_primary_language_title(domain, fr_lang):
    course = _make(domain, fr_lang, {"fr": {"title": "Mon Premier Cours"}})
    assert course.slug == "mon-premier-cours"


@pytest.mark.django_db
def test_create_appends_numeric_suffix_on_collision(domain, fr_lang):
    Course.objects.create(domain=domain, language=fr_lang, slug="mon-cours")
    course = _make(domain, fr_lang, {"fr": {"title": "Mon Cours"}})
    assert course.slug == "mon-cours-2"


@pytest.mark.django_db
def test_create_keeps_explicit_slug_when_provided(domain, fr_lang):
    course = _make(domain, fr_lang, {"fr": {"title": "Titre Quelconque"}}, slug="custom-slug")
    assert course.slug == "custom-slug"


@pytest.mark.django_db
def test_create_blank_slug_is_treated_as_missing(domain, fr_lang):
    course = _make(domain, fr_lang, {"fr": {"title": "Hello World"}}, slug="")
    assert course.slug == "hello-world"


@pytest.mark.django_db
def test_create_falls_back_when_title_does_not_slugify(domain, fr_lang):
    # CJK-only title slugifies to an empty string — make sure we still get a usable slug.
    course = _make(domain, fr_lang, {"fr": {"title": "中文"}})
    assert course.slug.startswith("course-")