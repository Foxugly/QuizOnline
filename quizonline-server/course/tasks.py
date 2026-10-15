"""Fill a section's / lesson's empty translations by machine translation."""

from __future__ import annotations

import logging

from celery import shared_task
from django.apps import apps
from django.conf import settings

from translation.services.deepl import DeepLError, deepl_translate_many

logger = logging.getLogger(__name__)

# model label -> {field: DeepL format}
_FIELDS = {
    "course.section": {"title": "text", "description": "html"},
    "lesson.lesson": {"title": "text"},
}


def _course_of(obj):
    return obj.course if hasattr(obj, "course") else obj.section.course


@shared_task
def fill_missing_translations(model_label: str, pk: int) -> list[str]:
    """Translate the course-language values of ``obj`` into every other
    allowed language of its domain, filling ONLY empty values. Never
    raises: no DeepL configured, or a DeepL error, leaves languages empty."""
    if not (getattr(settings, "USE_DEEPL", False) and getattr(settings, "DEEPL_AUTH_KEY", "")):
        return []
    fields = _FIELDS.get(model_label)
    if fields is None:
        return []
    obj = apps.get_model(model_label).objects.filter(pk=pk).first()
    if obj is None:
        return []
    course = _course_of(obj)
    source = course.language.code
    targets = [c for c in course.domain.allowed_languages.values_list("code", flat=True) if c != source]
    # Read the stored rows directly: parler's safe_translation_getter falls
    # back to other languages (PARLER_LANGUAGES fallback) even with
    # any_language=False, which would make empty targets look filled.
    own = {t.language_code: t for t in obj.translations.all()}

    def stored(field: str, lang: str) -> str:
        return (getattr(own[lang], field, "") or "").strip() if lang in own else ""

    sources = {f: stored(f, source) for f in fields}
    if not any(sources.values()):
        return []
    filled: list[str] = []
    for target in targets:
        missing = [
            f for f in fields
            if sources[f] and not stored(f, target)
        ]
        if not missing:
            continue
        try:
            values = {}
            for fmt in sorted({fields[f] for f in missing}):
                batch = [f for f in missing if fields[f] == fmt]
                out = deepl_translate_many([sources[f] for f in batch], source, target, fmt=fmt)
                values.update(dict(zip(batch, out, strict=True)))
        except (DeepLError, ValueError):
            logger.exception("Machine translation failed", extra={"model": model_label, "pk": pk, "target": target})
            continue
        obj.set_current_language(target)
        for f, v in values.items():
            if fields[f] == "html":
                # Sanitising happens in the serializers, not on model save:
                # machine-translated HTML must go through the same filter.
                from block.sanitizer import sanitize_rich_text

                v = sanitize_rich_text(v)
            setattr(obj, f, v)
        obj.save()
        filled.append(target)
    return filled


def enqueue_fill_missing_translations(model_label: str, pk: int) -> None:
    """Enqueue the task; a broker failure must never fail the create."""
    try:
        fill_missing_translations.delay(model_label, pk)
    except Exception:
        logger.exception("Could not enqueue machine translation", extra={"model": model_label, "pk": pk})
