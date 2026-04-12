from __future__ import annotations

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
