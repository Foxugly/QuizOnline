from django.utils import timezone

from domain.models import Domain

from .models import DomainBilling


def get_or_create_billing(domain: Domain) -> DomainBilling:
    billing, _ = DomainBilling.objects.get_or_create(domain=domain)
    return billing


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
