from django.contrib import admin

from .models import DomainBilling


@admin.register(DomainBilling)
class DomainBillingAdmin(admin.ModelAdmin):
    """Operator console for hosting subscriptions. Set ``plan`` and
    ``free_until`` here; ``member_count`` and the price are computed."""

    list_display = ("domain", "plan", "free_until", "member_count", "monthly_price_display")
    list_filter = ("plan",)
    raw_id_fields = ("domain",)
    readonly_fields = (
        "member_count",
        "member_count_updated_at",
        "monthly_price_display",
        "reminder_14d_sent_at",
        "reminder_3d_sent_at",
        "created_at",
        "updated_at",
    )

    @admin.display(description="Monthly price (EUR HTVA)")
    def monthly_price_display(self, obj: DomainBilling) -> int:
        return obj.monthly_price_eur_htva
