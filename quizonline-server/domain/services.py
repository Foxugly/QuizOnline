from __future__ import annotations

from datetime import timedelta
from typing import Any, Mapping

from django.contrib.auth import get_user_model
from django.utils import timezone

from domain.models import Domain, DomainAuditLog, DomainInvite, DomainJoinRequest, JoinPolicy
from domain.invite_token import INVITE_TOKEN_TTL_SECONDS

User = get_user_model()


def upsert_invite(*, domain: Domain, email: str, inviter) -> DomainInvite:
    """
    Get-or-create a pending DomainInvite for the (domain, email) pair.
    If a pending row already exists, refresh ``last_sent_at`` and
    ``expires_at`` so the caller can reuse it for a resend without
    minting a new DB row. The signed token is still emitted by the
    caller — this function manages the persistence side only.
    """
    now = timezone.now()
    new_expiry = now + timedelta(seconds=INVITE_TOKEN_TTL_SECONDS)
    obj, created = DomainInvite.objects.get_or_create(
        domain=domain,
        email=email.strip().lower(),
        status=DomainInvite.STATUS_PENDING,
        defaults={
            "inviter": inviter if getattr(inviter, "id", None) else None,
            "expires_at": new_expiry,
            "last_sent_at": now,
        },
    )
    if not created:
        obj.last_sent_at = now
        obj.expires_at = new_expiry
        obj.inviter = inviter if getattr(inviter, "id", None) else obj.inviter
        obj.save(update_fields=["last_sent_at", "expires_at", "inviter", "updated_at"])
    return obj


def auto_accept_pending_invites_for_email(*, user, email: str) -> list[DomainInvite]:
    """
    Sweep every pending DomainInvite addressed to ``email`` and accept
    it for ``user``: add to domain.members, mark the row ``accepted``,
    record an audit row. Returns the list of consumed invites so the
    caller can decide whether to notify the user / inviter.

    Called from the email-confirmation activation flow so the user
    lands inside every domain they had been invited to as soon as
    their account is active. Stateless: re-running is a no-op.
    """
    if not email:
        return []
    normalized = email.strip().lower()
    pending = list(
        DomainInvite.objects
        .select_for_update(of=("self",))
        .filter(email=normalized, status=DomainInvite.STATUS_PENDING, expires_at__gt=timezone.now())
        .select_related("domain")
    )
    if not pending:
        return []
    now = timezone.now()
    for inv in pending:
        # ``domain.members.add`` is idempotent at the M2M level: a
        # user who is already a member (e.g. re-confirmed their mail)
        # silently stays a member.
        inv.domain.members.add(user)
        inv.status = DomainInvite.STATUS_ACCEPTED
        inv.accepted_by = user
        inv.accepted_at = now
        inv.save(update_fields=["status", "accepted_by", "accepted_at", "updated_at"])
        DomainAuditLog.objects.create(
            domain=inv.domain,
            actor=user,
            target_user=user,
            action="invite.auto_accept_on_signup",
            metadata={"invite_id": inv.id, "inviter_id": inv.inviter_id},
        )
    return pending


def record_audit(
    *,
    domain: Domain | int,
    action: str,
    actor=None,
    target_user=None,
    metadata: Mapping[str, Any] | None = None,
) -> DomainAuditLog:
    """
    Append one row to the ``DomainAuditLog`` table.

    Centralised here so callers do not need to know the column names
    or import the model directly. ``domain`` may be a Domain instance
    or a primary-key int (useful when we hold a reference but the
    instance is not in scope).
    """
    domain_id = domain.id if isinstance(domain, Domain) else int(domain)
    return DomainAuditLog.objects.create(
        domain_id=domain_id,
        actor=actor if actor and getattr(actor, "id", None) else None,
        target_user=target_user if target_user and getattr(target_user, "id", None) else None,
        action=action[: DomainAuditLog.ACTION_MAX_LENGTH],
        metadata=dict(metadata or {}),
    )


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


ANALYTICS_RANGES: dict[str, int | None] = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "all": None,
}


def resolve_analytics_range(value: str | None) -> tuple[str, "object | None"]:
    """
    Map a ``range=`` query-string value to ``(range_key, since_datetime)``.
    Unknown / missing values fall back to ``"all"`` so a typo never
    400's the analytics page.
    """
    key = (value or "").strip() or "all"
    if key not in ANALYTICS_RANGES:
        key = "all"
    days = ANALYTICS_RANGES[key]
    since = None if days is None else (timezone.now() - timedelta(days=days))
    return key, since


def compute_join_request_analytics(domain, since=None) -> dict:
    """
    Aggregate per-domain join-request analytics. Pure-Python on top of
    a handful of ORM ``count`` / ``aggregate`` calls so the function
    stays portable across SQLite (tests) and Postgres (prod) without a
    backend-specific ``percentile_cont``.

    ``since`` is an optional cutoff datetime. When set, only requests
    *decided* on or after that cutoff feed the decision-related stats
    (approved / rejected / cancelled counts, accept rate, median time,
    top deciders). ``pending_count`` is always the current snapshot —
    a range filter on "pending" would just hide unresolved work.

    Returns::

        {
            "pending_count": int,
            "approved_count": int,
            "rejected_count": int,
            "cancelled_count": int,
            "total_decisions": int,        # approved + rejected
            "accept_rate_pct": float | None,
            "median_decision_seconds": int | None,
            "top_deciders": [{"name": str, "count": int}, ...],  # top 5
        }
    """
    from django.db.models import Count
    from domain.models import DomainJoinRequest

    qs = DomainJoinRequest.objects.filter(domain=domain)
    # ``pending_count`` and ``cancelled_count`` are *current* snapshots:
    # range filters apply to "decision activity" (approved / rejected /
    # the rate / the median / the top deciders) only. Hiding unresolved
    # work or self-cancellations behind a 7-day cutoff would be more
    # misleading than informative.
    pending = qs.filter(status=DomainJoinRequest.STATUS_PENDING).count()
    cancelled = qs.filter(status=DomainJoinRequest.STATUS_CANCELLED).count()

    decided_qs = qs.filter(decided_at__isnull=False)
    if since is not None:
        decided_qs = decided_qs.filter(decided_at__gte=since)

    by_status = {
        row["status"]: row["c"]
        for row in decided_qs.values("status").annotate(c=Count("id"))
    }
    approved = by_status.get(DomainJoinRequest.STATUS_APPROVED, 0)
    rejected = by_status.get(DomainJoinRequest.STATUS_REJECTED, 0)
    total_decisions = approved + rejected

    accept_rate: float | None = None
    if total_decisions > 0:
        accept_rate = round(approved * 100.0 / total_decisions, 1)

    # Median decision time: pull (decided_at - created_at) for every
    # decided row in scope and pick the middle value. Bounded by
    # ~thousands of rows per domain in realistic deployments, so the
    # Python loop is cheap and avoids vendor-specific SQL.
    decided_pairs = decided_qs.values_list("created_at", "decided_at")
    deltas_seconds = sorted(int((d - c).total_seconds()) for c, d in decided_pairs if d > c)
    median_seconds: int | None = None
    if deltas_seconds:
        n = len(deltas_seconds)
        median_seconds = deltas_seconds[n // 2] if n % 2 else (
            (deltas_seconds[n // 2 - 1] + deltas_seconds[n // 2]) // 2
        )

    # No ``username`` column any more: pull the name parts + email and
    # build the display name (full name, falling back to email) in Python.
    top_deciders_rows = (
        decided_qs.filter(decided_by__isnull=False)
          .values("decided_by__first_name", "decided_by__last_name", "decided_by__email")
          .annotate(c=Count("id"))
          .order_by("-c")[:5]
    )
    top_deciders = [
        {
            "name": (
                f"{r['decided_by__first_name']} {r['decided_by__last_name']}".strip()
                or r["decided_by__email"]
            ),
            "count": r["c"],
        }
        for r in top_deciders_rows
    ]

    return {
        "pending_count": pending,
        "approved_count": approved,
        "rejected_count": rejected,
        "cancelled_count": cancelled,
        "total_decisions": total_decisions,
        "accept_rate_pct": accept_rate,
        "median_decision_seconds": median_seconds,
        "top_deciders": top_deciders,
    }


MODERATION_TILE_CACHE_TTL_SECONDS = 60
_MODERATION_TILE_CACHE_KEY_FMT = "domain:moderation_tile:v1:{user_id}"


def _moderation_tile_cache_key(user_id: int) -> str:
    return _MODERATION_TILE_CACHE_KEY_FMT.format(user_id=user_id)


def invalidate_moderation_tile_for_users(user_ids) -> None:
    """
    Drop the cached moderation-tile payload for the listed user ids.

    Use this when a mutation changes *who* may moderate a given
    domain (membership / role / join_policy changes) — a user being
    demoted or removed still has their tile entry warm from before
    the change, and otherwise the entry would survive for up to the
    full TTL with stale "you have pending requests" claims.
    """
    from django.core.cache import cache

    ids = {int(uid) for uid in user_ids if uid}
    if not ids:
        return
    cache.delete_many([_moderation_tile_cache_key(uid) for uid in ids])


def invalidate_moderation_tile_for_domain(domain: Domain) -> None:
    """
    Drop the cached moderation-tile payload for every user who can
    currently moderate ``domain`` (owner, plus managers when the
    ``join_policy`` enables manager moderation). Superusers fall out
    of this set and may see ≤60 s stale data, which is acceptable
    for a dashboard tile and avoids fanning out the invalidation
    across the whole admin user base.

    Note: this only covers users who *currently* moderate the
    domain. Mutations that change the moderator set itself (member
    removal, manager demotion, join_policy toggle) must also call
    :func:`invalidate_moderation_tile_for_users` with the ids of
    the users whose rights are about to change — otherwise the
    just-demoted manager keeps their stale entry until the TTL.
    """
    user_ids: set[int] = {domain.owner_id} if domain.owner_id else set()
    if domain.join_policy == JoinPolicy.OWNER_MANAGERS:
        user_ids.update(domain.managers.values_list("id", flat=True))
    invalidate_moderation_tile_for_users(user_ids)


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

    Result is cached per-user for ``MODERATION_TILE_CACHE_TTL_SECONDS``.
    Mutations that affect a moderator's pending count
    (create / approve / reject / cancel) must call
    :func:`invalidate_moderation_tile_for_domain` to drop the entry
    early. Without an early invalidation the tile is at most that
    many seconds stale.
    """
    from django.core.cache import cache
    from django.db.models import Count, Q

    if not getattr(user, "is_authenticated", False):
        return []

    cache_key = _moderation_tile_cache_key(user.id)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

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

    # Resolve the display name directly from the prefetched translations
    # queryset. ``safe_translation_getter`` would still issue one SELECT
    # per domain because parler's per-language cache doesn't share state
    # with the ``prefetch_related`` cache when ``any_language=True``.
    from django.utils.translation import get_language

    active_lang = get_language() or ""

    out = []
    for domain in qs:
        translations = list(domain.translations.all())
        by_code = {t.language_code: t.name for t in translations}
        name = (
            by_code.get(active_lang)
            or next((t.name for t in translations if t.name), None)
            or f"Domain#{domain.id}"
        )
        out.append({
            "id": domain.id,
            "name": name,
            "pending_count": domain.pending_count,
        })
    cache.set(cache_key, out, timeout=MODERATION_TILE_CACHE_TTL_SECONDS)
    return out


def send_expiring_join_request_warnings(
    *,
    auto_decline_days: int = 30,
    warn_days_before: int = 3,
) -> int:
    """
    Email the requester of every pending join request that will
    auto-cancel within ``warn_days_before`` days — once and only once
    per row, gated by ``expiry_warning_sent_at``.

    Returns the number of warnings actually queued.
    """
    from core.mailers.domain_join import send_join_request_expiry_warning_email

    now = timezone.now()
    # Window: requests created between (decline_threshold - warn_days) and
    # (decline_threshold). The lower bound prevents us from re-flagging
    # 60-day-old rows that already passed the auto-decline cutoff (those
    # are cleaned up by the dedicated task).
    decline_threshold = now - timedelta(days=auto_decline_days)
    warn_threshold = decline_threshold + timedelta(days=warn_days_before)
    expiring = list(
        DomainJoinRequest.objects.filter(
            status=DomainJoinRequest.STATUS_PENDING,
            expiry_warning_sent_at__isnull=True,
            created_at__lte=warn_threshold,
            created_at__gt=decline_threshold,
        ).select_related("user", "domain")
    )
    sent = 0
    for jr in expiring:
        days_left = max(
            1,
            auto_decline_days - int((now - jr.created_at).total_seconds() // 86400),
        )
        send_join_request_expiry_warning_email(join_request=jr, days_left=days_left)
        # Tag the row with NOW so a re-run on the same day is a no-op
        # even if mail delivery itself is async — the row is "committed"
        # to having been warned the moment we enqueue.
        DomainJoinRequest.objects.filter(pk=jr.pk).update(expiry_warning_sent_at=now)
        sent += 1
    return sent


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
