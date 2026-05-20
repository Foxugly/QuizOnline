from __future__ import annotations

from django.db import models, transaction

from course.services import compact, two_phase_reorder

from .models import Lesson


@transaction.atomic
def reorder_lessons(*, section, lesson_ids_in_order: list[int]) -> list[Lesson]:
    return two_phase_reorder(Lesson, models.Q(section=section), lesson_ids_in_order)


@transaction.atomic
def compact_lessons(*, section):
    return compact(Lesson, models.Q(section=section))
