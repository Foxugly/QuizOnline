from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from domain.models import Domain, DomainJoinRequest, JoinPolicy

User = get_user_model()


def users_who_can_approve(domain: Domain) -> list:
    """Owner + managers (if policy is owner_managers). De-duplicated."""
    approvers = {domain.owner}
    if domain.join_policy == JoinPolicy.OWNER_MANAGERS:
        approvers.update(domain.managers.all())
    return [u for u in approvers if u is not None]


def flip_pending_to_approved(domain, user, *, by) -> int:
    """
    If `user` has a pending DomainJoinRequest for `domain`, mark it as
    approved and return 1; otherwise return 0. Used on the admin-push race.
    """
    return (
        DomainJoinRequest.objects
        .filter(domain=domain, user=user, status=DomainJoinRequest.STATUS_PENDING)
        .update(
            status=DomainJoinRequest.STATUS_APPROVED,
            decided_by=by,
            decided_at=timezone.now(),
        )
    )


def domains_with_pending_for_user(user) -> list[dict]:
    """
    For the moderation dashboard tile: list the domains the user can
    moderate that currently have at least one pending join request.
    Returns ``[{id, name, pending_count}]`` ordered by pending_count
    descending (so the busiest domain shows up first).

    Implementation note: the "can-moderate" set mirrors
    :class:`CanApproveJoinRequest`:

      - superuser sees everything;
      - the owner sees their domains;
      - a manager sees the domain only if its ``join_policy`` is
        ``OWNER_MANAGERS``.
    """
    from django.db.models import Count, Q

    if not getattr(user, "is_authenticated", False):
        return []

    if user.is_superuser:
        moderable_qs = Domain.objects.filter(active=True)
    else:
        moderable_qs = Domain.objects.filter(active=True).filter(
            Q(owner=user)
            | Q(managers=user, join_policy=JoinPolicy.OWNER_MANAGERS)
        )

    qs = (
        moderable_qs.distinct()
        .annotate(
            pending_count=Count(
                "join_requests",
                filter=Q(join_requests__status=DomainJoinRequest.STATUS_PENDING),
                distinct=True,
            )
        )
        .filter(pending_count__gt=0)
        .order_by("-pending_count", "id")
        .prefetch_related("translations")
    )

    out = []
    for domain in qs:
        out.append({
            "id": domain.id,
            "name": domain.safe_translation_getter("name", any_language=True) or f"Domain#{domain.id}",
            "pending_count": domain.pending_count,
        })
    return out


def auto_decline_stale_pending_requests(*, older_than_days: int = 30) -> int:
    """
    Mark as ``CANCELLED`` all pending join requests created more than
    ``older_than_days`` ago. No emails are sent: the goal is to keep the
    moderation queue clean from forgotten requests.

    A monotonic single-column update (PENDING → CANCELLED) — no
    ``select_for_update`` because the worst case of a concurrent approve
    is "the approve wins" (last-write-wins), which is acceptable.

    Returns the number of rows updated.
    """
    cutoff = timezone.now() - timedelta(days=older_than_days)
    return (
        DomainJoinRequest.objects
        .filter(status=DomainJoinRequest.STATUS_PENDING, created_at__lt=cutoff)
        .update(status=DomainJoinRequest.STATUS_CANCELLED)
    )


def auto_approve_pending_requests(domain, *, by) -> list[DomainJoinRequest]:
    """
    Mark all pending requests on `domain` as approved (e.g., when the
    join_policy is downgraded to `auto`). Adds each requester to
    `domain.members` and returns the list of approved requests so the
    caller can dispatch notification emails.
    """
    pending = list(
        DomainJoinRequest.objects
        .filter(domain=domain, status=DomainJoinRequest.STATUS_PENDING)
        .select_related("user")
    )
    if not pending:
        return []
    now = timezone.now()
    ids = [r.id for r in pending]
    DomainJoinRequest.objects.filter(id__in=ids).update(
        status=DomainJoinRequest.STATUS_APPROVED,
        decided_by=by,
        decided_at=now,
    )
    domain.members.add(*[r.user_id for r in pending])
    # Re-fetch with the new state so callers see the right status when iterating.
    return list(
        DomainJoinRequest.objects.filter(id__in=ids).select_related("user", "domain")
    )
