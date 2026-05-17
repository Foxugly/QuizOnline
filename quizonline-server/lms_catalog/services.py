from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .models import ContentBlock, Course, Lesson, Section


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
    return course


@transaction.atomic
def unpublish_course(*, course: Course, by_user) -> Course:
    course.is_published = False
    course.updated_by = by_user
    course.save(update_fields=["is_published", "updated_by"])
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
    return new
