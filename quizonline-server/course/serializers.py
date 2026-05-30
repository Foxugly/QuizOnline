from django.utils.text import slugify
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from core.serializers import TranslationsField, filter_allowed_lang_codes
from language.models import Language

from .models import Course, CourseAuditLog, Section


# Backwards-compatible alias — the helper used to be private to
# ``course/serializers.py`` (and is still imported by tests under that
# name). Prefer ``filter_allowed_lang_codes`` from ``core.serializers``
# in new code.
_filter_allowed_lang_codes = filter_allowed_lang_codes


class SectionSerializer(serializers.ModelSerializer):
    translations = TranslationsField()
    available_lang_codes = serializers.SerializerMethodField()
    lessons = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = ["id", "course", "order", "is_published", "translations", "available_lang_codes", "lessons"]
        read_only_fields = ["id", "lessons"]

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_available_lang_codes(self, obj) -> list[str]:
        return sorted(obj.course.domain.allowed_languages.values_list("code", flat=True))

    @extend_schema_field({"type": "array", "items": {"$ref": "#/components/schemas/LessonDetail"}})
    def get_lessons(self, obj):
        from lesson.serializers import LessonDetailSerializer
        return LessonDetailSerializer(obj.lessons.all(), many=True, context=self.context).data

    def create(self, validated_data):
        tr = validated_data.pop("translations", {})
        instance = Section.objects.create(**validated_data)
        return self._apply(instance, tr)

    def update(self, instance, validated_data):
        tr = validated_data.pop("translations", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if tr is not None:
            self._apply(instance, tr)
        return instance

    def _apply(self, instance, tr_dict):
        tr_dict = _filter_allowed_lang_codes(tr_dict, instance.course)
        for lang, fields in tr_dict.items():
            instance.set_current_language(lang)
            for k, v in fields.items():
                setattr(instance, k, v)
            instance.save()
        return instance


def _derive_unique_course_slug(language, translations: dict | None) -> str:
    """Derive a unique slug for a new Course from its primary-language title.

    Looks up the title in the Course's primary language first, then falls
    back to any provided translation. If no title slugifies to a non-empty
    value (e.g. CJK-only titles), uses a timestamped ``"course-<n>"`` shape
    so the create call still succeeds. Appends ``-2``, ``-3``, ... on
    collisions until uniqueness is reached.
    """
    primary_code = getattr(language, "code", None)
    candidates = []
    if translations:
        if primary_code and isinstance(translations.get(primary_code), dict):
            candidates.append(translations[primary_code].get("title", ""))
        for code, fields in translations.items():
            if code == primary_code:
                continue
            if isinstance(fields, dict):
                candidates.append(fields.get("title", ""))
    base = ""
    for title in candidates:
        base = slugify(title or "")
        if base:
            break
    if not base:
        base = f"course-{Course.objects.count() + 1}"
    candidate = base
    n = 2
    while Course.objects.filter(slug=candidate).exists():
        candidate = f"{base}-{n}"
        n += 1
    return candidate[:220]


class CourseAuditLogSerializer(serializers.ModelSerializer):
    """Read-only audit row exposed by ``/api/course/{id}/audit-log/``.

    ``actor_username`` resolves the FK once at serializer time so the
    consumer doesn't have to do its own lookup — frontends typically
    just want "who did it" rendered as a name, not a foreign key id.
    """
    actor_username = serializers.SerializerMethodField()

    class Meta:
        model = CourseAuditLog
        fields = ["id", "action", "actor", "actor_username", "metadata", "created_at"]
        read_only_fields = fields

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_actor_username(self, obj) -> str | None:
        return obj.actor.username if obj.actor_id else None


class CourseListSerializer(serializers.ModelSerializer):
    translations = TranslationsField()
    language_code = serializers.SlugRelatedField(source="language", slug_field="code", read_only=True)
    # Aggregated counters surfaced on every catalog card. Computed
    # via DB-level aggregation so a 500-course list does not turn into
    # 500 ``COUNT(*)`` round-trips.
    lesson_count = serializers.SerializerMethodField()
    total_duration_minutes = serializers.SerializerMethodField()
    # Personal context: the caller's enrollment status (``null`` when
    # not enrolled) + their course-progress percentage + the next
    # uncompleted lesson id. Drives the "Continue learning" button and
    # the enrolled / progress badges on the catalog card.
    my_enrollment = serializers.SerializerMethodField()
    # Pending course invitation (if any) for the calling user — same
    # shape on both list and detail responses. Surfaced on the list
    # too so the catalog card can render a small "Invited" chip and
    # the learner does not have to open the detail page to discover
    # they have an unread invitation.
    my_pending_invite = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id", "slug", "level", "language_code", "estimated_duration",
            "enrollment_mode", "is_published", "published_at",
            "cover_image", "translations", "domain",
            "lesson_count", "total_duration_minutes", "my_enrollment",
            "my_pending_invite",
        ]

    @extend_schema_field(serializers.IntegerField())
    def get_lesson_count(self, obj) -> int:
        # The list view annotates ``lesson_count_db`` on the queryset
        # to avoid N+1; the retrieve view falls back to an explicit count.
        annotated = getattr(obj, "lesson_count_db", None)
        if annotated is not None:
            return int(annotated)
        from lesson.models import Lesson
        return Lesson.objects.filter(section__course=obj).count()

    @extend_schema_field(serializers.IntegerField())
    def get_total_duration_minutes(self, obj) -> int:
        annotated = getattr(obj, "total_duration_db", None)
        if annotated is not None:
            return int(annotated or 0)
        from django.db.models import Sum
        from lesson.models import Lesson
        agg = Lesson.objects.filter(section__course=obj).aggregate(total=Sum("estimated_duration"))
        return int(agg["total"] or 0)

    @extend_schema_field({
        "type": "object",
        "nullable": True,
        "properties": {
            "status": {"type": "string"},
            "progress_percent": {"type": "integer"},
            "next_lesson_id": {"type": "integer", "nullable": True},
        },
        "required": ["status", "progress_percent", "next_lesson_id"],
    })
    def get_my_enrollment(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return None
        # Fast path: the list view pre-builds the per-page lookups in
        # ``CourseViewSet._build_my_enrollment_context`` so we avoid
        # the N+1 storm that would otherwise hit on a 20-course page.
        if "_enrollments_by_course" in self.context:
            enrollment = self.context["_enrollments_by_course"].get(obj.id)
            if not enrollment:
                return None
            progress = self.context["_progresses_by_course"].get(obj.id)
            lessons = self.context["_lessons_by_course"].get(obj.id, [])
            completed = self.context["_completed_lessons"]
            next_lesson_id = next((lid for lid in lessons if lid not in completed), None)
            return {
                "status": enrollment.status,
                "progress_percent": int(progress.progress_percent) if progress else 0,
                "next_lesson_id": next_lesson_id,
            }
        # Retrieve / detail path: single-instance queries are cheap and
        # avoid forcing every caller to pre-build the context.
        from lesson.models import Lesson
        from enrollment.models import CourseEnrollment, CourseProgress, LessonProgress
        enrollment = CourseEnrollment.objects.filter(course=obj, user=user).first()
        if not enrollment:
            return None
        progress = CourseProgress.objects.filter(course=obj, user=user).first()
        progress_pct = int(progress.progress_percent) if progress else 0
        lessons = list(
            Lesson.objects.filter(section__course=obj)
            .order_by("section__order", "order", "id")
            .values_list("id", flat=True)
        )
        completed_ids = set(
            LessonProgress.objects.filter(
                user=user, lesson_id__in=lessons, is_completed=True
            ).values_list("lesson_id", flat=True)
        )
        next_lesson_id = next((lid for lid in lessons if lid not in completed_ids), None)
        return {
            "status": enrollment.status,
            "progress_percent": progress_pct,
            "next_lesson_id": next_lesson_id,
        }

    @extend_schema_field({
        "type": "object",
        "nullable": True,
        "properties": {
            "id": {"type": "integer"},
            "token": {"type": "string"},
            "expires_at": {"type": "string", "format": "date-time"},
            "inviter_display_name": {"type": "string"},
        },
        "required": ["id", "token", "expires_at", "inviter_display_name"],
    })
    def get_my_pending_invite(self, obj):
        """Pending ``CourseInvite`` for the calling user, if any.

        Surfaced on both list and detail. The catalog list view
        pre-builds a ``_pending_invites_by_course`` map in
        ``CourseViewSet._build_my_enrollment_context`` to keep this
        O(1) per row. The detail / retrieve path falls through to a
        single per-course query.

        Returns ``None`` for anonymous callers or when the user has
        no pending invitation on this course.
        """
        request = self.context.get("request")
        user = getattr(request, "user", None) if request is not None else None
        if user is None or not getattr(user, "is_authenticated", False):
            return None
        if "_pending_invites_by_course" in self.context:
            return self.context["_pending_invites_by_course"].get(obj.id)
        from enrollment.models import CourseInvite
        invite = (
            CourseInvite.objects.filter(
                course=obj,
                invitee=user,
                status=CourseInvite.STATUS_PENDING,
            )
            .select_related("created_by")
            .order_by("-created_at")
            .first()
        )
        if not invite:
            return None
        return {
            "id": invite.id,
            "token": invite.token,
            "expires_at": invite.expires_at.isoformat(),
            "inviter_display_name": (
                invite.created_by.get_display_name() if invite.created_by else ""
            ),
        }


class CourseDetailSerializer(CourseListSerializer):
    sections = SectionSerializer(many=True, read_only=True)
    available_lang_codes = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()

    class Meta(CourseListSerializer.Meta):
        fields = CourseListSerializer.Meta.fields + [
            "sections", "available_lang_codes", "can_manage",
            "created_at", "updated_at",
        ]

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_available_lang_codes(self, obj) -> list[str]:
        return sorted(obj.domain.allowed_languages.values_list("code", flat=True))

    @extend_schema_field(serializers.BooleanField())
    def get_can_manage(self, obj) -> bool:
        from .permissions import is_lms_instructor
        request = self.context.get("request")
        return bool(request and is_lms_instructor(request.user, obj))


class CourseWriteSerializer(serializers.ModelSerializer):
    translations = TranslationsField()
    language_code = serializers.SlugRelatedField(queryset=Language.objects.all(), source="language", slug_field="code")
    # Allow omitted / blank slug on create — :meth:`create` derives one from
    # the primary-language title. Edits never auto-rename the slug (URL
    # stability), so leaving this optional is safe.
    slug = serializers.SlugField(max_length=220, required=False, allow_blank=True)

    class Meta:
        model = Course
        fields = [
            "id", "slug", "level", "language_code", "estimated_duration",
            "enrollment_mode", "cover_image", "domain", "translations",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        tr = validated_data.pop("translations", {})
        if not (validated_data.get("slug") or "").strip():
            validated_data["slug"] = _derive_unique_course_slug(validated_data.get("language"), tr)
        instance = Course(**validated_data)
        instance.full_clean()
        instance.save()
        return self._apply(instance, tr)

    def update(self, instance, validated_data):
        tr = validated_data.pop("translations", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.full_clean()
        instance.save()
        if tr is not None:
            self._apply(instance, tr)
        return instance

    def _apply(self, instance, tr_dict):
        tr_dict = _filter_allowed_lang_codes(tr_dict, instance)
        for lang, fields in tr_dict.items():
            instance.set_current_language(lang)
            for k, v in fields.items():
                setattr(instance, k, v)
            instance.save()
        return instance
