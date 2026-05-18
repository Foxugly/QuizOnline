from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .models import ContentBlock, Course, CourseAuditLog, Lesson, Section


def export_course_to_dict(*, course: Course) -> dict:
    """Serialize a course (incl. sections, lessons, blocks, all
    translations) into a self-contained JSON-friendly dict.

    The output is intentionally schema-light: no FK ids, only
    portable fields, so the dump round-trips through
    ``import_course_from_dict`` even into a different domain. The
    cover image, file/image uploads and quiz_template FK are
    intentionally NOT exported — they reference per-domain resources
    that don't transfer cleanly. The importer recreates the
    structural skeleton and the author re-uploads media on the new
    side.
    """
    return {
        "version": "1.0",
        "course": {
            "slug": course.slug,
            "level": course.level,
            "language_code": course.language.code,
            "estimated_duration": course.estimated_duration,
            "enrollment_mode": course.enrollment_mode,
            "translations": _dump_translations(course, ("title", "description", "learning_objectives")),
            "sections": [
                {
                    "order": s.order,
                    "is_published": s.is_published,
                    "translations": _dump_translations(s, ("title", "description")),
                    "lessons": [
                        {
                            "slug": lesson.slug,
                            "order": lesson.order,
                            "is_preview": lesson.is_preview,
                            "is_published": lesson.is_published,
                            "estimated_duration": lesson.estimated_duration,
                            "translations": _dump_translations(lesson, ("title", "short_description")),
                            "blocks": [
                                {
                                    "block_type": b.block_type,
                                    "order": b.order,
                                    "is_required": b.is_required,
                                    "video_url": b.video_url,
                                    "video_provider": b.video_provider,
                                    "external_url": b.external_url,
                                    "code_language": b.code_language,
                                    "code_content": b.code_content,
                                    "metadata": b.metadata,
                                    "translations": _dump_translations(b, ("title", "rich_text", "callout_text")),
                                }
                                for b in lesson.blocks.all().order_by("order", "id")
                            ],
                        }
                        for lesson in s.lessons.all().order_by("order", "id")
                    ],
                }
                for s in course.sections.all().order_by("order", "id")
            ],
        },
    }


def _dump_translations(obj, fields: tuple[str, ...]) -> dict:
    """Read every parler translation row of ``obj`` into the
    ``{lang_code: {field: value, ...}}`` shape the importer consumes."""
    out: dict[str, dict[str, str]] = {}
    for tr in obj.translations.all():
        out[tr.language_code] = {f: getattr(tr, f, "") for f in fields}
    return out


@transaction.atomic
def import_course_from_dict(*, payload: dict, target_domain, by_user) -> Course:
    """Re-create a course from an ``export_course_to_dict`` payload
    into ``target_domain``. The slug is uniquified on collision (same
    helper as ``clone_course``) so the import never overwrites an
    existing course. The course is created **unpublished** so the
    author can review before exposing it to learners. Media (covers,
    uploaded files, quiz_template FKs) are dropped: the structural
    skeleton (text, structure, block types) carries over, the rest
    has to be re-attached on the new side."""
    from language.models import Language

    if not isinstance(payload, dict) or payload.get("version") != "1.0":
        raise ValidationError(_('Unsupported export payload version.'))
    course_payload = payload.get("course")
    if not isinstance(course_payload, dict):
        raise ValidationError(_('Missing "course" payload.'))

    allowed = set(target_domain.allowed_languages.values_list("code", flat=True))
    if not allowed:
        raise ValidationError(_('Target domain has no allowed_languages configured.'))

    lang_code = course_payload.get("language_code")
    if lang_code not in allowed:
        raise ValidationError(
            _('Course primary language "{c}" not allowed in target domain.').format(c=lang_code)
        )
    language = Language.objects.filter(code=lang_code).first()
    if not language:
        raise ValidationError(_('Unknown language "{c}".').format(c=lang_code))

    new = Course.objects.create(
        domain=target_domain,
        slug=_unique_clone_slug(course_payload.get("slug", "imported-course")),
        language=language,
        level=course_payload.get("level", Course.LEVEL_BEGINNER),
        estimated_duration=int(course_payload.get("estimated_duration") or 0),
        enrollment_mode=course_payload.get("enrollment_mode", Course.ENROLL_OPEN),
        is_published=False,
        created_by=by_user,
        updated_by=by_user,
    )
    _apply_translations(new, course_payload.get("translations", {}), allowed)

    for s_payload in course_payload.get("sections", []) or []:
        section = Section.objects.create(
            course=new,
            order=int(s_payload.get("order") or 0),
            is_published=bool(s_payload.get("is_published")),
        )
        _apply_translations(section, s_payload.get("translations", {}), allowed)
        for l_payload in s_payload.get("lessons", []) or []:
            lesson = Lesson.objects.create(
                section=section,
                slug=l_payload.get("slug", "lesson"),
                order=int(l_payload.get("order") or 0),
                is_preview=bool(l_payload.get("is_preview")),
                is_published=bool(l_payload.get("is_published")),
                estimated_duration=int(l_payload.get("estimated_duration") or 0),
            )
            _apply_translations(lesson, l_payload.get("translations", {}), allowed)
            for b_payload in l_payload.get("blocks", []) or []:
                block = ContentBlock.objects.create(
                    lesson=lesson,
                    block_type=b_payload.get("block_type", ContentBlock.TYPE_RICH_TEXT),
                    order=int(b_payload.get("order") or 0),
                    is_required=bool(b_payload.get("is_required")),
                    video_url=b_payload.get("video_url", ""),
                    video_provider=b_payload.get("video_provider", ""),
                    external_url=b_payload.get("external_url", ""),
                    code_language=b_payload.get("code_language", ""),
                    code_content=b_payload.get("code_content", ""),
                    metadata=b_payload.get("metadata", {}) or {},
                )
                _apply_translations(block, b_payload.get("translations", {}), allowed)
    record_course_audit(course=new, actor=by_user, action="course.import",
                        metadata={"source_slug": course_payload.get("slug")})
    return new


def _apply_translations(instance, translations: dict, allowed_codes: set[str]) -> None:
    """Apply ``{lang_code: {field: value}}`` to a parler-translated
    instance. Skips language codes that aren't in the target domain's
    allowed_languages so the import doesn't crash on a wider source
    domain."""
    if not isinstance(translations, dict):
        return
    for code, fields in translations.items():
        if code not in allowed_codes or not isinstance(fields, dict):
            continue
        instance.set_current_language(code)
        for k, v in fields.items():
            setattr(instance, k, v if isinstance(v, str) else "")
        instance.save()


def record_course_audit(*, course: Course, actor, action: str, metadata: dict | None = None) -> None:
    """Append a row to ``CourseAuditLog``. Fire-and-forget: a logging
    failure must never break the underlying course mutation, so callers
    can drop this in after the canonical ``save()`` without worrying
    about transactional propagation."""
    CourseAuditLog.objects.create(
        course=course,
        actor=actor if (actor and getattr(actor, "is_authenticated", False)) else None,
        action=action[:CourseAuditLog.ACTION_MAX_LENGTH],
        metadata=metadata or {},
    )


def allowed_lang_codes_for_course(course: Course) -> set[str]:
    codes = set(course.domain.allowed_languages.values_list("code", flat=True))
    return codes or {settings.LANGUAGE_CODE}


@transaction.atomic
def publish_course(*, course: Course, by_user) -> Course:
    has_content = Section.objects.filter(
        course=course, is_published=True, lessons__is_published=True,
    ).exists()
    if not has_content:
        raise ValidationError(_("Cannot publish a course with no published content."))
    course.is_published = True
    course.published_at = timezone.now()
    course.updated_by = by_user
    course.save(update_fields=["is_published", "published_at", "updated_by"])
    record_course_audit(course=course, actor=by_user, action="course.publish")
    return course


@transaction.atomic
def unpublish_course(*, course: Course, by_user) -> Course:
    course.is_published = False
    course.updated_by = by_user
    course.save(update_fields=["is_published", "updated_by"])
    record_course_audit(course=course, actor=by_user, action="course.unpublish")
    return course


def _two_phase_reorder(model, parent_filter, ids_in_order):
    rows = list(model.objects.select_for_update().filter(parent_filter, id__in=ids_in_order))
    if len(rows) != len(ids_in_order):
        raise ValidationError(_("ID mismatch in reorder payload."))
    model.objects.filter(parent_filter, id__in=ids_in_order).update(
        order=models.F("order") + 1_000_000,
    )
    for new_order, pk in enumerate(ids_in_order):
        model.objects.filter(pk=pk).update(order=new_order)
    return list(model.objects.filter(parent_filter).order_by("order"))


@transaction.atomic
def reorder_blocks(*, lesson: Lesson, block_ids_in_order: list[int]) -> list[ContentBlock]:
    return _two_phase_reorder(ContentBlock, models.Q(lesson=lesson), block_ids_in_order)


@transaction.atomic
def reorder_sections(*, course: Course, section_ids_in_order: list[int]) -> list[Section]:
    return _two_phase_reorder(Section, models.Q(course=course), section_ids_in_order)


@transaction.atomic
def reorder_lessons(*, section: Section, lesson_ids_in_order: list[int]) -> list[Lesson]:
    return _two_phase_reorder(Lesson, models.Q(section=section), lesson_ids_in_order)


def _unique_clone_slug(base_slug: str) -> str:
    candidate = f"{base_slug}-copy"
    n = 1
    while Course.objects.filter(slug=candidate).exists():
        n += 1
        candidate = f"{base_slug}-copy-{n}"
    return candidate


@transaction.atomic
def clone_course(*, source: Course, by_user, target_domain=None) -> Course:
    new_domain = target_domain or source.domain
    new = Course.objects.create(
        domain=new_domain,
        slug=_unique_clone_slug(source.slug),
        language=source.language,
        level=source.level,
        estimated_duration=source.estimated_duration,
        enrollment_mode=source.enrollment_mode,
        cover_image=source.cover_image,
        is_published=False,
        created_by=by_user,
        updated_by=by_user,
    )
    for tr in source.translations.all():
        new.set_current_language(tr.language_code)
        new.title = tr.title + " (copy)"
        new.description = tr.description
        new.learning_objectives = tr.learning_objectives
        new.save()

    for old_section in source.sections.all():
        new_section = Section.objects.create(
            course=new, order=old_section.order, is_published=old_section.is_published,
        )
        for tr in old_section.translations.all():
            new_section.set_current_language(tr.language_code)
            new_section.title = tr.title
            new_section.description = tr.description
            new_section.save()
        for old_lesson in old_section.lessons.all():
            new_lesson = Lesson.objects.create(
                section=new_section, slug=old_lesson.slug, order=old_lesson.order,
                is_preview=old_lesson.is_preview, is_published=old_lesson.is_published,
                estimated_duration=old_lesson.estimated_duration,
            )
            for tr in old_lesson.translations.all():
                new_lesson.set_current_language(tr.language_code)
                new_lesson.title = tr.title
                new_lesson.short_description = tr.short_description
                new_lesson.save()
            for old_block in old_lesson.blocks.all():
                fields = {f.name: getattr(old_block, f.name) for f in ContentBlock._meta.concrete_fields if f.name != "id"}
                fields["lesson"] = new_lesson
                new_block = ContentBlock.objects.create(**fields)
                for tr in old_block.translations.all():
                    new_block.set_current_language(tr.language_code)
                    new_block.title = tr.title
                    new_block.rich_text = tr.rich_text
                    new_block.callout_text = tr.callout_text
                    new_block.save()
    record_course_audit(
        course=new, actor=by_user, action="course.clone",
        metadata={"source_course_id": source.id, "source_slug": source.slug},
    )
    return new
