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
