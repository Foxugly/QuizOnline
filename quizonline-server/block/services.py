from __future__ import annotations

from django.contrib.contenttypes.models import ContentType
from django.db import models, transaction

from course.services import compact, two_phase_reorder

from .models import Block


def _lesson_filter(lesson) -> models.Q:
    """Reorder/compact primitives need a parent-scoped ``Q`` to anchor
    the two-phase shuffle. Now that ``Block`` is polymorphic, the
    parent scope is the ``(content_type, object_id)`` pair instead of
    the previous plain ``lesson`` FK.
    """
    lesson_ct = ContentType.objects.get_for_model(type(lesson))
    return models.Q(target_content_type=lesson_ct, target_object_id=lesson.id)


@transaction.atomic
def reorder_blocks(*, lesson, block_ids_in_order: list[int]) -> list[Block]:
    return two_phase_reorder(Block, _lesson_filter(lesson), block_ids_in_order)


@transaction.atomic
def compact_blocks(*, lesson):
    return compact(Block, _lesson_filter(lesson))
