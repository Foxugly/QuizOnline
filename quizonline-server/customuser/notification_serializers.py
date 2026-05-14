from rest_framework import serializers

from customuser.models import Notification


class NotificationReadSerializer(serializers.ModelSerializer):
    """Shape returned by ``GET /api/notification/`` and friends."""

    class Meta:
        model = Notification
        fields = [
            "id",
            "kind",
            "payload",
            "read_at",
            "deleted_at",
            "created_at",
        ]
        read_only_fields = fields
