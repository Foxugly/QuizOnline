import math

from django.db import models
from django.utils import timezone


class DomainBilling(models.Model):
    """Per-domain hosting subscription state.

    Pricing (EUR, excl. VAT / HTVA): a base tier for the first 100 members,
    then +20 EUR per additional started tier of 100 members::

        monthly_price = 20 * (1 + ceil(members / 100))

    so 1-100 -> 40, 101-200 -> 60, 201-300 -> 80, ...

    A domain on the ``free`` plan pays nothing until ``free_until`` (the
    operator-set deadline). ``free_until = NULL`` means free indefinitely —
    the safe default so nothing is ever blocked until a deadline is set.
    Payment itself is handled manually (out of band) for now; this model only
    tracks the state and the computed price.
    """

    PLAN_FREE = "free"
    PLAN_PAID = "paid"
    PLAN_CHOICES = [
        (PLAN_FREE, "Free"),
        (PLAN_PAID, "Paid"),
    ]

    PRICE_BASE_EUR = 20      # EUR HTVA per tier
    USERS_PER_TIER = 100

    domain = models.OneToOneField(
        "domain.Domain", on_delete=models.CASCADE, related_name="billing",
    )
    plan = models.CharField(max_length=8, choices=PLAN_CHOICES, default=PLAN_FREE)
    # Deadline for the free plan. NULL = free indefinitely (never blocked).
    # Operator-managed (Django admin) — self-service payment is a later phase.
    free_until = models.DateTimeField(null=True, blank=True)
    # Recomputed by the daily beat task from Domain.members.count().
    member_count = models.PositiveIntegerField(default=0)
    member_count_updated_at = models.DateTimeField(null=True, blank=True)
    # Idempotency stamps for the pre-deadline reminder emails.
    reminder_14d_sent_at = models.DateTimeField(null=True, blank=True)
    reminder_3d_sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"DomainBilling<{self.domain_id}:{self.plan}>"

    @property
    def monthly_price_eur_htva(self) -> int:
        """Monthly price in EUR excl. VAT for the current member count.
        The first 100 members (including 0) are the base tier."""
        tiers = max(1, math.ceil(self.member_count / self.USERS_PER_TIER))
        return self.PRICE_BASE_EUR * (1 + tiers)

    def is_past_deadline(self, *, now=None) -> bool:
        """True when a free-plan domain has passed its (set) deadline.
        Paid plans and free-without-deadline are never past-deadline."""
        if self.plan != self.PLAN_FREE or self.free_until is None:
            return False
        return (now or timezone.now()) >= self.free_until
