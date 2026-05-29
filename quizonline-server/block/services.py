from __future__ import annotations

from django.contrib.contenttypes.models import ContentType
from django.db import models, transaction

from core.services import compact, two_phase_reorder

from .models import Block


def _host_filter(host, *, block_role: str | None = None) -> models.Q:
    """Reorder/compact primitives need a parent-scoped ``Q`` to anchor
    the two-phase shuffle. Now that ``Block`` is polymorphic, the
    parent scope is the ``(content_type, object_id)`` pair, optionally
    narrowed to a single ``block_role`` so the per-role uniqueness
    constraint ``UNIQUE(target, block_role, order)`` is respected.
    """
    host_ct = ContentType.objects.get_for_model(type(host))
    q = models.Q(target_content_type=host_ct, target_object_id=host.id)
    if block_role is not None:
        q &= models.Q(block_role=block_role)
    return q


@transaction.atomic
def reorder_blocks(*, host, block_ids_in_order: list[int], block_role: str | None = None) -> list[Block]:
    """Reorder ``host``'s blocks (optionally restricted to a ``block_role``
    bucket). ``host`` may be a Lesson, Question, AnswerOption — any model
    that can carry blocks through the GFK.
    """
    return two_phase_reorder(Block, _host_filter(host, block_role=block_role), block_ids_in_order)


@transaction.atomic
def compact_blocks(*, host, block_role: str | None = None):
    """Renumber ``host``'s blocks so ``order`` is densely packed starting
    at 0. If ``block_role`` is given, only that bucket is compacted —
    otherwise every distinct role on the host is compacted independently.
    """
    if block_role is not None:
        return compact(Block, _host_filter(host, block_role=block_role))
    host_ct = ContentType.objects.get_for_model(type(host))
    roles = (
        Block.objects.filter(
            target_content_type=host_ct, target_object_id=host.id,
        )
        .values_list("block_role", flat=True)
        .distinct()
    )
    out: list[Block] = []
    for role in roles:
        out.extend(compact(Block, _host_filter(host, block_role=role)))
    return out
