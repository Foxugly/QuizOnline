from rest_framework import serializers

from .models import DomainBilling


class DomainBillingSerializer(serializers.ModelSerializer):
    """Read-only subscription view for the domain owner/manager. Plan and
    deadline are operator-managed (Django admin), so they are not writable
    here."""

    monthly_price_eur_htva = serializers.IntegerField(read_only=True)
    is_past_deadline = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()

    class Meta:
        model = DomainBilling
        fields = [
            "plan",
            "free_until",
            "member_count",
            "member_count_updated_at",
            "monthly_price_eur_htva",
            "is_past_deadline",
            "currency",
        ]
        read_only_fields = fields

    def get_is_past_deadline(self, obj: DomainBilling) -> bool:
        return obj.is_past_deadline()

    def get_currency(self, obj: DomainBilling) -> str:
        return "EUR"
