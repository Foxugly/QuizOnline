from django.utils import timezone

from domain.models import Domain

from .models import DomainBilling


def get_or_create_billing(domain: Domain) -> DomainBilling:
    billing, _ = DomainBilling.objects.get_or_create(domain=domain)
    return billing


def blocked_domain_ids(domain_qs=None, *, now=None) -> set[int]:
    """IDs of domains whose free period has elapsed (plan=free + free_until in
    the past). These are the domains a non-owner/manager member is locked out
    of. Optionally restricted to ``domain_qs`` to avoid scanning all billing
    rows. One query, no N+1."""
    now = now or timezone.now()
    qs = DomainBilling.objects.filter(
        plan=DomainBilling.PLAN_FREE,
        free_until__isnull=False,
        free_until__lte=now,
    )
    if domain_qs is not None:
        qs = qs.filter(domain__in=domain_qs)
    return set(qs.values_list("domain_id", flat=True))


def is_domain_blocked(domain, *, now=None) -> bool:
    """True when this domain is past its free deadline (billing row exists,
    free plan, deadline elapsed). No billing row => not blocked (safe default)."""
    billing = DomainBilling.objects.filter(domain=domain).first()
    return bool(billing and billing.is_past_deadline(now=now))


def recompute_member_count(billing: DomainBilling) -> int:
    """Refresh ``member_count`` from the domain's members M2M and stamp the
    update time. Returns the new count."""
    count = billing.domain.members.count()
    billing.member_count = count
    billing.member_count_updated_at = timezone.now()
    billing.save(
        update_fields=["member_count", "member_count_updated_at", "updated_at"],
    )
    return count
