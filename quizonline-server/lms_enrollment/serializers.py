from rest_framework import serializers

from .models import Certificate, CourseEnrollment, CourseProgress, LessonProgress


class CourseEnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseEnrollment
        fields = ["id", "user", "course", "status", "enrolled_at", "completed_at"]
        read_only_fields = ["id", "user", "enrolled_at", "completed_at", "status"]


class LessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonProgress
        fields = [
            "id", "user", "lesson", "is_started", "is_completed", "progress_percent",
            "started_at", "completed_at", "last_seen_at",
        ]
        read_only_fields = ["id", "user", "started_at", "completed_at", "last_seen_at"]


class CourseProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseProgress
        fields = [
            "id", "user", "course", "completed_lessons_count", "total_lessons_count",
            "progress_percent", "updated_at",
        ]
        read_only_fields = [
            "id", "user", "course", "completed_lessons_count",
            "total_lessons_count", "progress_percent", "updated_at",
        ]


class CertificateSerializer(serializers.ModelSerializer):
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = [
            "id", "user", "course", "certificate_number", "issued_at",
            "pdf_url", "revoked_at",
        ]
        read_only_fields = [
            "id", "user", "course", "certificate_number", "issued_at",
            "pdf_url", "revoked_at",
        ]

    def get_pdf_url(self, obj):
        if obj.pdf:
            return obj.pdf.url
        return None


class CertificateVerifySerializer(serializers.Serializer):
    """Public verify endpoint payload — minimal."""

    valid = serializers.BooleanField()
    certificate_number = serializers.CharField()
    course_title = serializers.CharField()
    user_display_name = serializers.CharField()
    issued_at = serializers.DateTimeField()
    revoked = serializers.BooleanField()
