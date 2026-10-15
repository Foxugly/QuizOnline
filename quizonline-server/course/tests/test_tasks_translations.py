from unittest import mock

import pytest
from django.test import override_settings

from course.models import Section
from course.tasks import fill_missing_translations
from language.models import Language
from lesson.models import Lesson

DEEPL = "course.tasks.deepl_translate_many"


@pytest.fixture
def bilingual(course):
    en = Language.objects.get_or_create(code="en", defaults={"name": "English"})[0]
    nl = Language.objects.get_or_create(code="nl", defaults={"name": "Dutch"})[0]
    course.domain.allowed_languages.add(en, nl)
    return course


def _section(course, **titles):
    s = Section.objects.create(course=course, order=0)
    for lang, title in titles.items():
        s.set_current_language(lang)
        s.title = title
        s.save()
    return s


@pytest.mark.django_db
@override_settings(USE_DEEPL=True, DEEPL_AUTH_KEY="k")
def test_fills_only_empty_languages(bilingual):
    s = _section(bilingual, fr="Introduction", en="Hand-written")
    with mock.patch(DEEPL, side_effect=lambda texts, source, target, fmt="text": [f"{target}:{t}" for t in texts]) as m:
        filled = fill_missing_translations("course.section", s.pk)
    assert filled == ["nl"]
    assert m.call_count == 1
    s.refresh_from_db()
    assert s.safe_translation_getter("title", language_code="en") == "Hand-written"
    assert s.safe_translation_getter("title", language_code="nl") == "nl:Introduction"


@pytest.mark.django_db
@override_settings(USE_DEEPL=False, DEEPL_AUTH_KEY="")
def test_noop_without_deepl(bilingual):
    s = _section(bilingual, fr="Intro")
    with mock.patch(DEEPL) as m:
        assert fill_missing_translations("course.section", s.pk) == []
    m.assert_not_called()


@pytest.mark.django_db
@override_settings(USE_DEEPL=True, DEEPL_AUTH_KEY="k")
def test_single_language_domain_is_noop(course):
    s = _section(course, fr="Intro")
    with mock.patch(DEEPL) as m:
        assert fill_missing_translations("course.section", s.pk) == []
    m.assert_not_called()


@pytest.mark.django_db
@override_settings(USE_DEEPL=True, DEEPL_AUTH_KEY="k")
def test_deepl_error_is_swallowed(bilingual):
    from translation.services.deepl import DeepLError
    s = _section(bilingual, fr="Intro")
    with mock.patch(DEEPL, side_effect=DeepLError("boom")):
        assert fill_missing_translations("course.section", s.pk) == []


@pytest.mark.django_db
@override_settings(USE_DEEPL=True, DEEPL_AUTH_KEY="k")
def test_lesson_title_is_translated(bilingual):
    section = Section.objects.create(course=bilingual, order=0)
    lesson = Lesson.objects.create(section=section, slug="l", order=0)
    lesson.set_current_language("fr")
    lesson.title = "Bonjour"
    lesson.save()
    with mock.patch(DEEPL, side_effect=lambda texts, source, target, fmt="text": [f"{target}:{t}" for t in texts]):
        assert sorted(fill_missing_translations("lesson.lesson", lesson.pk)) == ["en", "nl"]


@pytest.mark.django_db
@override_settings(USE_DEEPL=True, DEEPL_AUTH_KEY="k")
def test_translated_html_description_is_sanitized(bilingual):
    s = _section(bilingual, fr="Intro")
    s.set_current_language("fr")
    s.description = "<p>Salut</p>"
    s.save()
    evil = lambda texts, source, target, fmt="text": (  # noqa: E731
        [t if fmt == "text" else "<p>x</p><script>alert(1)</script>" for t in texts]
    )
    with mock.patch(DEEPL, side_effect=evil):
        fill_missing_translations("course.section", s.pk)
    s.refresh_from_db()
    assert "<script" not in s.safe_translation_getter("description", language_code="nl")


@pytest.mark.django_db
def test_enqueued_on_create_not_on_update(owner, course, django_capture_on_commit_callbacks):
    from rest_framework.test import APIClient
    client = APIClient()
    client.force_authenticate(user=owner)
    with mock.patch("course.tasks.fill_missing_translations.delay") as delay:
        with django_capture_on_commit_callbacks(execute=True):
            resp = client.post("/api/v1/section/", {"course": course.id, "translations": {"fr": {"title": "S"}}}, format="json")
        assert resp.status_code == 201
        delay.assert_called_once_with("course.section", resp.json()["id"])
        with django_capture_on_commit_callbacks(execute=True):
            client.patch(f"/api/v1/section/{resp.json()['id']}/", {"translations": {"fr": {"title": "S2"}}}, format="json")
        assert delay.call_count == 1
