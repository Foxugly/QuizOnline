from rest_framework import serializers
from .models import ConnectionEvent


class ConnectionEventWriteSerializer(serializers.Serializer):
    """Browser-supplied context only. Server derives account/ip/ua/geo."""
    login_method = serializers.ChoiceField(
        choices=[ConnectionEvent.PASSWORD, ConnectionEvent.MAGIC_LINK],
        default=ConnectionEvent.PASSWORD,
    )
    local_time = serializers.CharField(required=False, allow_blank=True, max_length=64)
    browser_language = serializers.CharField(required=False, allow_blank=True, max_length=64)
    timezone = serializers.CharField(required=False, allow_blank=True, max_length=64)
    screen_width = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    screen_height = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    online = serializers.BooleanField(required=False, allow_null=True)


class ConnectionEventReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConnectionEvent
        fields = [
            "id", "account_email", "created_at", "login_method", "ip",
            "user_agent", "browser", "os", "local_time", "browser_language",
            "timezone", "screen_width", "screen_height", "online",
            "country", "country_code", "city", "region", "latitude", "longitude",
        ]
