from __future__ import annotations

from django.db import models, transaction

from course.services import compact, two_phase_reorder

from .models import ContentBlock


@transaction.atomic
def reorder_blocks(*, lesson, block_ids_in_order: list[int]) -> list[ContentBlock]:
    return two_phase_reorder(ContentBlock, models.Q(lesson=lesson), block_ids_in_order)


@transaction.atomic
def compact_blocks(*, lesson):
    return compact(ContentBlock, models.Q(lesson=lesson))
