from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from config.serializers import UserSummarySerializer

from .models import (
    Certificate,
    CourseEnrollment,
    CourseInvite,
    CourseProgress,
    LessonNote,
    LessonProgress,
)


def _request_user_language(serializer) -> str:
    """Pick the language the calling user prefers — falls back to fr."""
    request = serializer.context.get("request")
    user = getattr(request, "user", None) if request is not None else None
    return getattr(user, "language", None) or "fr"


def _localized_course_title(course, lang: str) -> str:
    """Localized Course.title via parler, falling back to the slug."""
    return course.safe_translation_getter("title", language_code=lang, any_language=True) or course.slug


def _enrollment_user_summary(user) -> dict:
    """Compact read-only user descriptor used by the enrollment list. Mirrors
    ``UserSummarySerializer`` so the generated OpenAPI client picks up a typed
    object instead of an opaque dict."""
    return {
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "email": user.email or "",
    }


class CourseEnrollmentSerializer(serializers.ModelSerializer):
    """Read-only enrollment row. ``user`` stays as an int FK for write-side
    compatibility; ``user_detail`` carries the username/email/display-name
    needed by the instructor-facing enrollment table without a chatty extra
    request per row."""

    user_detail = serializers.SerializerMethodField()

    class Meta:
        model = CourseEnrollment
        fields = [
            "id",
            "user",
            "user_detail",
            "course",
            "status",
            "enrolled_at",
            "completed_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "user_detail",
            "enrolled_at",
            "completed_at",
            "status",
        ]

    @extend_schema_field(UserSummarySerializer(allow_null=True))
    def get_user_detail(self, obj) -> dict | None:
        return _enrollment_user_summary(obj.user) if obj.user_id else None


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


class LessonNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonNote
        fields = ["id", "user", "lesson", "content", "created_at", "updated_at"]
        read_only_fields = ["id", "user", "created_at", "updated_at"]


class CourseInviteSerializer(serializers.ModelSerializer):
    """Read shape for course invitations. Carries enough denormalized
    context (course title, invitee/inviter summaries) that the
    instructor-side list and the invitee-side accept page can both
    render without chaining extra requests."""

    course_title = serializers.SerializerMethodField()
    course_slug = serializers.CharField(source="course.slug", read_only=True)
    invitee_detail = serializers.SerializerMethodField()
    inviter_detail = serializers.SerializerMethodField()

    class Meta:
        model = CourseInvite
        fields = [
            "id",
            "token",
            "course",
            "course_title",
            "course_slug",
            "invitee",
            "invitee_detail",
            "inviter",
            "inviter_detail",
            "status",
            "expires_at",
            "last_sent_at",
            "accepted_at",
            "declined_at",
            "revoked_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_course_title(self, obj) -> str:
        return _localized_course_title(obj.course, _request_user_language(self))

    @extend_schema_field(UserSummarySerializer(allow_null=True))
    def get_invitee_detail(self, obj) -> dict | None:
        return _enrollment_user_summary(obj.invitee) if obj.invitee_id else None

    @extend_schema_field(UserSummarySerializer(allow_null=True))
    def get_inviter_detail(self, obj) -> dict | None:
        return _enrollment_user_summary(obj.inviter) if obj.inviter_id else None


class CourseInviteSendSerializer(serializers.Serializer):
    """Write shape for ``POST /api/lms/course/{id}/invite/``. The
    instructor picks an invitee by their ``user_id``; that user must
    already be a member of the course's domain (enforced by the
    service layer)."""

    invitee_id = serializers.IntegerField()


class CertificateVerifySerializer(serializers.Serializer):
    """Public verify endpoint payload — minimal."""

    valid = serializers.BooleanField()
    certificate_number = serializers.CharField()
    course_title = serializers.CharField()
    user_display_name = serializers.CharField()
    issued_at = serializers.DateTimeField()
    revoked = serializers.BooleanField()
