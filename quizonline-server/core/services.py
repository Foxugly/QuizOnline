"""Cross-cutting service primitives shared across feature apps.

The two helpers here — ``two_phase_reorder`` and ``compact`` — are used
by ``course``, ``lesson`` and ``block`` to enforce the per-parent
``UNIQUE(parent, order)`` invariant while shuffling rows without
briefly violating it. Keeping them in ``core`` instead of ``course``
breaks the upward dependency that previously had ``lesson`` and
``block`` importing from their semantic parent app.
"""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _


def two_phase_reorder(model, parent_filter, ids_in_order):
    """Shared two-phase reorder primitive used by every per-parent
    ordering helper.

    Bumps every affected row's ``order`` by 1_000_000 first (well outside
    any sane ``UNIQUE(parent, order)`` collision range) and then writes
    the final dense 0..N-1 values one at a time. The split lets the
    DB enforce its uniqueness constraint at every step without us having
    to play with deferred constraints or temporary placeholders.
    """
    rows = list(model.objects.select_for_update().filter(parent_filter, id__in=ids_in_order))
    if len(rows) != len(ids_in_order):
        raise ValidationError(_("ID mismatch in reorder payload."))
    model.objects.filter(parent_filter, id__in=ids_in_order).update(
        order=models.F("order") + 1_000_000,
    )
    for new_order, pk in enumerate(ids_in_order):
        model.objects.filter(pk=pk).update(order=new_order)
    return list(model.objects.filter(parent_filter).order_by("order"))


def compact(model, parent_filter):
    """Renumber surviving rows to 0..N-1 in their current ``order``.

    Run this after a delete so the next insertion picks a free slot
    against the ``UNIQUE(parent, order)`` constraint without the caller
    having to reason about gaps. Reuses ``two_phase_reorder`` so the
    constraint is never briefly violated mid-update.
    """
    ids = list(model.objects.filter(parent_filter).order_by("order").values_list("id", flat=True))
    if not ids:
        return []
    return two_phase_reorder(model, parent_filter, ids)
