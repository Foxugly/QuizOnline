from rest_framework import serializers


class TestEmailRequestSerializer(serializers.Serializer):
    to = serializers.EmailField()
    subject = serializers.CharField(required=False, allow_blank=True, max_length=255)
    body = serializers.CharField(required=False, allow_blank=True)


class TestEmailResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    email_id = serializers.IntegerField()
    recipients = serializers.ListField(child=serializers.EmailField())
    subject = serializers.CharField()
