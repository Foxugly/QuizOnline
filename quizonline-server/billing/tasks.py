"""Celery tasks for per-domain hosting billing."""

import math
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from domain.models import Domain

from .models import DomainBilling
from .notifications import notify_billing_deadline
from .services import get_or_create_billing, recompute_member_count

# Pre-deadline reminder milestones on DISJOINT day-bands, so the owner is
# emailed at most once per milestone. Idempotency is the per-row stamp, not
# the cadence.
_REMINDER_MILESTONES = (
    (14, 3, "reminder_14d_sent_at"),
    (3, 0, "reminder_3d_sent_at"),
)


@shared_task
def recompute_and_remind_billing() -> dict:
    """Daily: ensure every domain has a billing row with a fresh member
    count, then email free-plan owners whose deadline is approaching
    (14 days, then 3 days out). Returns a small summary for logs/tests."""
    now = timezone.now()

    domains = 0
    for domain in Domain.objects.all():
        billing = get_or_create_billing(domain)
        recompute_member_count(billing)
        domains += 1

    reminders = 0
    for upper_days, lower_days, stamp_field in _REMINDER_MILESTONES:
        qs = DomainBilling.objects.filter(
            plan=DomainBilling.PLAN_FREE,
            free_until__gt=now + timedelta(days=lower_days),
            free_until__lte=now + timedelta(days=upper_days),
            **{f"{stamp_field}__isnull": True},
        ).select_related("domain", "domain__owner")
        for billing in qs:
            days = max(1, math.ceil((billing.free_until - now).total_seconds() / 86400))
            # Stamp before sending so a mail-queue failure skips a reminder
            # rather than resending every run.
            DomainBilling.objects.filter(pk=billing.pk).update(**{stamp_field: now})
            setattr(billing, stamp_field, now)
            notify_billing_deadline(billing, days=days)
            reminders += 1

    return {"domains": domains, "reminders": reminders}
