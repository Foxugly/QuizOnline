"""SECURITY (GHSA-v3m3-f69x-jf25): the SPA renders course ``description`` /
``learning_objectives`` and block ``rich_text`` with
``bypassSecurityTrustHtml``. A caller can skip Quill entirely and hit the API,
so the server must strip every payload whatever the write path — including
the course import of blocks, which used to store the last language raw.
"""

import importlib

import pytest
from django.apps import apps as django_apps

from block.models import Block
from course.models import Course
from course.services import clone_course, import_course_from_dict

PAYLOADS = {
    "img_onerror": "<p>ok</p><img src=x onerror=alert(1)>",
    "script": "<p>ok</p><script>alert(1)</script>",
    "javascript_href": '<p><a href="javascript:alert(1)">clic</a></p>',
}


def _assert_clean(html: str) -> None:
    low = html.lower()
    assert "onerror" not in low
    assert "<script" not in low
    assert "alert(1)" not in low
    assert "javascript:" not in low


def _import_payload(html: str) -> dict:
    return {
        "version": "1.0",
        "course": {
            "slug": "imported",
            "level": Course.LEVEL_BEGINNER,
            "language_code": "fr",
            "estimated_duration": 0,
            "enrollment_mode": Course.ENROLL_OPEN,
            "translations": {"fr": {"title": "T", "description": html, "learning_objectives": html}},
            "sections": [{
                "translations": {"fr": {"title": "S"}},
                "lessons": [{
                    "translations": {"fr": {"title": "L"}},
                    "blocks": [{
                        "block_type": "rich_text",
                        "translations": {"fr": {"rich_text": html}, "en": {"rich_text": html}},
                    }],
                }],
            }],
        },
    }


@pytest.mark.django_db
@pytest.mark.parametrize("html", PAYLOADS.values(), ids=PAYLOADS.keys())
def test_import_sanitizes_every_block_language(domain, en_lang, owner, html):
    domain.allowed_languages.add(en_lang)
    new = import_course_from_dict(payload=_import_payload(html), target_domain=domain, by_user=owner)
    rows = [
        tr.rich_text
        for block in Block.objects.filter(target_object_id__in=[
            lesson.pk for section in new.sections.all() for lesson in section.lessons.all()
        ])
        for tr in block.translations.all()
    ]
    assert len(rows) == 2
    for rich_text in rows:
        _assert_clean(rich_text)
    new.set_current_language("fr")
    _assert_clean(new.description)
    _assert_clean(new.learning_objectives)


@pytest.mark.django_db
@pytest.mark.parametrize("html", PAYLOADS.values(), ids=PAYLOADS.keys())
def test_block_translation_sanitized_on_any_save(lesson, html):
    block = Block(target=lesson, block_type=Block.TYPE_RICH_TEXT)
    block.set_current_language("fr")
    block.rich_text = html
    block.save()  # first save: no pre-existing translation row
    _assert_clean(block.translations.get(language_code="fr").rich_text)

    translation_model = Block._parler_meta.root_model
    translation_model.objects.update_or_create(
        master_id=block.pk, language_code="en", defaults={"rich_text": html},
    )
    _assert_clean(block.translations.get(language_code="en").rich_text)


@pytest.mark.django_db
@pytest.mark.parametrize("field", ["description", "learning_objectives"])
@pytest.mark.parametrize("html", PAYLOADS.values(), ids=PAYLOADS.keys())
def test_course_translation_sanitized_on_any_save(course, field, html):
    course.set_current_language("fr")
    setattr(course, field, html)
    course.save()
    _assert_clean(getattr(course.translations.get(language_code="fr"), field))


@pytest.mark.django_db
@pytest.mark.parametrize("html", PAYLOADS.values(), ids=PAYLOADS.keys())
def test_clone_sanitizes_block_rich_text(course, lesson, owner, html):
    block = Block.objects.create(target=lesson, block_type=Block.TYPE_RICH_TEXT)
    # Simulate a legacy dirty row (written before the hook): bypass save().
    translation_model = Block._parler_meta.root_model
    translation_model.objects.bulk_create([
        translation_model(master_id=block.pk, language_code="fr", rich_text=html),
    ])
    new = clone_course(source=course, by_user=owner)
    cloned = Block.objects.exclude(pk=block.pk).filter(
        target_object_id__in=[ls.pk for s in new.sections.all() for ls in s.lessons.all()]
    )
    assert cloned.exists()
    for b in cloned:
        for tr in b.translations.all():
            _assert_clean(tr.rich_text)


@pytest.mark.django_db
@pytest.mark.parametrize("html", PAYLOADS.values(), ids=PAYLOADS.keys())
def test_data_migrations_clean_existing_rows(course, lesson, html):
    block = Block.objects.create(target=lesson, block_type=Block.TYPE_RICH_TEXT)
    block_tr = Block._parler_meta.root_model
    course_tr = Course._parler_meta.root_model
    block_tr.objects.bulk_create([block_tr(master_id=block.pk, language_code="fr", rich_text=html)])
    course_tr.objects.filter(master_id=course.pk).update(description=html, learning_objectives=html)

    importlib.import_module("block.migrations.0004_sanitize_existing_rich_text").sanitize_rows(django_apps, None)
    importlib.import_module("course.migrations.0005_sanitize_existing_rich_text").sanitize_rows(django_apps, None)

    _assert_clean(block_tr.objects.get(master_id=block.pk).rich_text)
    for tr in course_tr.objects.filter(master_id=course.pk):
        _assert_clean(tr.description)
        _assert_clean(tr.learning_objectives)
