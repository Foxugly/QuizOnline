from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .models import Course, Section


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
