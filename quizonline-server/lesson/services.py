from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import Q
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from core.services import compact, two_phase_reorder

from .models import Lesson

# ``Lesson.slug`` is a SlugField(max_length=220); keep room for a "-NN" suffix.
_SLUG_BASE_MAX = 200


def lesson_slug_base(slug: str | None, translations: dict, course) -> str:
    """Slug from the explicit value, else from the course-language title,
    else from any title. ``"lesson"`` when slugify swallows everything
    (punctuation-only or non-Latin titles)."""
    candidates = [slug or ""]
    primary = getattr(getattr(course, "language", None), "code", None)
    if primary:
        candidates.append((translations.get(primary) or {}).get("title") or "")
    candidates += [(fields or {}).get("title") or "" for fields in translations.values()]
    for raw in candidates:
        base = slugify(raw)[:_SLUG_BASE_MAX].strip("-")
        if base:
            return base
    return "lesson"


def unique_lesson_slug(section, base: str) -> str:
    """``base``, or ``base-2``, ``base-3``… — the first one free in
    ``section`` (UNIQUE(section, slug)). Two lessons titled
    "Introduction" no longer 400 the second create."""
    taken = set(
        Lesson.objects.filter(section=section, slug__startswith=base)
        .values_list("slug", flat=True)
    )
    if base not in taken:
        return base
    n = 2
    while f"{base}-{n}" in taken:
        n += 1
    return f"{base}-{n}"


@transaction.atomic
def reorder_lessons(*, section, lesson_ids_in_order: list[int]) -> list[Lesson]:
    return two_phase_reorder(Lesson, models.Q(section=section), lesson_ids_in_order)


@transaction.atomic
def compact_lessons(*, section):
    return compact(Lesson, models.Q(section=section))


@transaction.atomic
def publish_lesson(*, lesson: Lesson, by_user) -> Lesson:
    # Lesson is not an AuditMixin and has no published_at — ``publish()``
    # only flips ``is_published``. The parent course (lesson.section.course)
    # carries the audit trail so publish/unpublish stay traceable, mirroring
    # ``publish_course`` / ``publish_section``.
    from course.services import record_course_audit

    lesson.publish()
    lesson.save(update_fields=["is_published"])
    record_course_audit(
        course=lesson.section.course, actor=by_user, action="lesson.publish",
        metadata={"lesson_id": lesson.id},
    )
    return lesson


@transaction.atomic
def unpublish_lesson(*, lesson: Lesson, by_user) -> Lesson:
    from course.services import record_course_audit

    lesson.unpublish()
    lesson.save(update_fields=["is_published"])
    record_course_audit(
        course=lesson.section.course, actor=by_user, action="lesson.unpublish",
        metadata={"lesson_id": lesson.id},
    )
    return lesson


@transaction.atomic
def move_lesson(*, lesson: Lesson, section, position: int) -> Lesson:
    """Move ``lesson`` into ``section`` at ``position`` (clamped to the end).

    Blocks, progress and quiz bindings stay attached (FKs unchanged). The
    slug is made unique in the target section, and both sections end up
    with dense 0..N-1 orders."""
    source = lesson.section
    if section.course_id != source.course_id:
        raise ValidationError(_("A lesson can only move within its course."))
    section_model = type(section)
    # Lock both parents in a stable order to avoid deadlocks.
    for pk in sorted({source.pk, section.pk}):
        section_model.objects.select_for_update().filter(pk=pk).first()
    target_ids = list(
        Lesson.objects.filter(section=section).exclude(pk=lesson.pk)
        .order_by("order", "id").values_list("id", flat=True)
    )
    position = max(0, min(int(position), len(target_ids)))
    if section.pk != source.pk:
        lesson.slug = unique_lesson_slug(section, lesson.slug)
        lesson.section = section
        lesson.order = 2_000_000 + lesson.pk  # out of the way of UNIQUE(section, order)
        lesson.save(update_fields=["section", "slug", "order"])
        compact(Lesson, Q(section=source))
    target_ids.insert(position, lesson.pk)
    two_phase_reorder(Lesson, Q(section=section), target_ids)
    lesson.refresh_from_db()
    return lesson
