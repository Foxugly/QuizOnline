from rest_framework import serializers

from .models import Certificate, CourseEnrollment, CourseProgress, LessonProgress


def _request_user_language(serializer) -> str:
    """Pick the language the calling user prefers — falls back to fr."""
    request = serializer.context.get("request")
    user = getattr(request, "user", None) if request is not None else None
    return getattr(user, "language", None) or "fr"


def _localized_course_title(course, lang: str) -> str:
    """Localized Course.title via parler, falling back to the slug."""
    return course.safe_translation_getter("title", language_code=lang, any_language=True) or course.slug


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
    course_title = serializers.SerializerMethodField()

    class Meta:
        model = CourseProgress
        fields = [
            "id", "user", "course", "course_title",
            "completed_lessons_count", "total_lessons_count",
            "progress_percent", "updated_at",
        ]
        read_only_fields = [
            "id", "user", "course", "course_title",
            "completed_lessons_count", "total_lessons_count",
            "progress_percent", "updated_at",
        ]

    def get_course_title(self, obj) -> str:
        return _localized_course_title(obj.course, _request_user_language(self))


class CertificateSerializer(serializers.ModelSerializer):
    pdf_url = serializers.SerializerMethodField()
    course_title = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = [
            "id", "user", "course", "course_title", "certificate_number",
            "verification_token", "issued_at", "pdf_url", "revoked_at",
        ]
        read_only_fields = [
            "id", "user", "course", "course_title", "certificate_number",
            "verification_token", "issued_at", "pdf_url", "revoked_at",
        ]

    def get_pdf_url(self, obj):
        if obj.pdf:
            return obj.pdf.url
        return None

    def get_course_title(self, obj) -> str:
        return _localized_course_title(obj.course, _request_user_language(self))


class CertificateVerifySerializer(serializers.Serializer):
    """Public verify endpoint payload — minimal."""

    valid = serializers.BooleanField()
    certificate_number = serializers.CharField()
    course_title = serializers.CharField()
    user_display_name = serializers.CharField()
    issued_at = serializers.DateTimeField()
    revoked = serializers.BooleanField()
