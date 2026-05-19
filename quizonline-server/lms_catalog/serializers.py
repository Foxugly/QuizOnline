from django.utils.text import slugify
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from language.models import Language

from .models import ContentBlock, Course, CourseAuditLog, Lesson, Section


@extend_schema_field({
    "type": "object",
    "additionalProperties": {"type": "object", "additionalProperties": {"type": "string"}},
    "example": {"fr": {"title": "Bonjour"}, "en": {"title": "Hello"}},
})
class TranslationsField(serializers.Field):
    """Serialize a parler ``TranslatableModel``'s translations as ``{lang: {field: value}}``.

    Read path: enumerates every existing translation row and exposes its translated
    fields (excluding the parler bookkeeping columns ``id``/``master``/``language_code``).

    Write path: accepts an opaque dict that the parent serializer is expected to
    consume in its ``create``/``update`` hook (see :func:`_filter_allowed_lang_codes`).
    """

    def to_representation(self, value):
        # ``value`` may be either the model instance (when the field is called
        # directly, e.g. ``TranslationsField().to_representation(course)``) or
        # the parler ``RelatedManager`` (when invoked from a ModelSerializer
        # bound to the ``translations`` source). The manager exposes the
        # owning instance via ``.instance``.
        if hasattr(value, "translations"):
            instance = value
        elif hasattr(value, "instance"):
            instance = value.instance
        else:
            instance = self.parent.instance
        result = {}
        for tr in instance.translations.all():
            row = {}
            for field in tr._meta.get_fields():
                if field.name in {"id", "master", "language_code"}:
                    continue
                row[field.name] = getattr(tr, field.name)
            result[tr.language_code] = row
        return result

    def to_internal_value(self, data):
        if not isinstance(data, dict):
            raise serializers.ValidationError("Expected a dict of {lang_code: {field: value}}.")
        return data


def _filter_allowed_lang_codes(data: dict, course: Course) -> dict:
    """Drop translation rows whose ``language_code`` is not in the course
    domain's ``allowed_languages``. Returns the empty dict unchanged so
    callers that intentionally pass ``{}`` (e.g. the "draft" create flow
    where the frontend posts a block with no content yet) never trip on
    a domain that has no language configured — that scenario should be
    flagged where actual content needs to land, not at the empty-draft
    handshake."""
    if not data:
        return data
    allowed = set(course.domain.allowed_languages.values_list("code", flat=True))
    if not allowed:
        raise serializers.ValidationError("Domain has no allowed_languages configured.")
    return {k: v for k, v in data.items() if k in allowed}


class ContentBlockSerializer(serializers.ModelSerializer):
    translations = TranslationsField()

    class Meta:
        model = ContentBlock
        fields = [
            "id", "lesson", "block_type", "order", "is_required",
            "image", "video_url", "video_provider", "file", "external_url",
            "code_language", "code_content", "quiz_template",
            "metadata", "translations",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        # On create (``self.instance is None``), allow the block to be saved as
        # a draft with no content. The frontend block-builder UX creates an
        # empty block as soon as the author clicks "+ Add <type>" and only
        # then fills the payload in via debounced PATCH calls — so the
        # initial POST genuinely has no per-type content yet and must not be
        # rejected. ``ContentBlock.clean()`` still runs on every UPDATE
        # below, and Django admin keeps calling ``full_clean()`` directly,
        # so the per-type validators remain enforced everywhere else.
        if self.instance is None:
            return attrs

        instance = self.instance
        for k, v in attrs.items():
            if k != "translations":
                setattr(instance, k, v)

        # Fold incoming translations into parler's in-memory cache so that
        # ``ContentBlock.clean()._has_translated_value(...)`` sees the
        # caller's brand-new ``rich_text`` / ``callout_text`` value during
        # ``full_clean()``. Without this, the very first PATCH that supplies
        # the per-type content would always 400 because nothing is in the
        # DB yet and the cache is empty. The values folded here are
        # transient — the real persistence happens in ``_apply_translations``
        # after the parent ``save()`` returns from ``update()``.
        tr_dict = attrs.get("translations")
        if isinstance(tr_dict, dict):
            for lang, fields in tr_dict.items():
                if not isinstance(fields, dict):
                    continue
                instance.set_current_language(lang)
                for k, v in fields.items():
                    setattr(instance, k, v)

        instance.full_clean(exclude=["lesson"] if not getattr(instance, "lesson_id", None) else None)
        return attrs

    def create(self, validated_data):
        tr = validated_data.pop("translations", {})
        instance = ContentBlock.objects.create(**validated_data)
        return self._apply_translations(instance, tr)

    def update(self, instance, validated_data):
        tr = validated_data.pop("translations", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if tr is not None:
            self._apply_translations(instance, tr)
        return instance

    def _apply_translations(self, instance, tr_dict):
        from .sanitizer import sanitize_rich_text
        course = instance.lesson.section.course
        tr_dict = _filter_allowed_lang_codes(tr_dict, course)
        for lang, fields in tr_dict.items():
            if "rich_text" in fields:
                fields["rich_text"] = sanitize_rich_text(fields["rich_text"])
            instance.set_current_language(lang)
            for k, v in fields.items():
                setattr(instance, k, v)
            instance.save()
        return instance


class LessonDetailSerializer(serializers.ModelSerializer):
    translations = TranslationsField()
    blocks = ContentBlockSerializer(many=True, read_only=True)
    available_lang_codes = serializers.SerializerMethodField()
    # Exposed read-only so the lesson-author shell can render a "Back to
    # course" affordance without a second round-trip through the section
    # endpoint just to look up the parent course id.
    course_id = serializers.SerializerMethodField()
    # Slug of the parent course — the public lesson-view back button
    # uses ``/lms/course/{slug}`` rather than the id-based edit route.
    course_slug = serializers.SerializerMethodField()
    # Domain id of the parent course — surfaced so the lesson-edit
    # shell can filter quiz-template pickers (and any future
    # domain-scoped affordance) without a second round-trip.
    domain_id = serializers.SerializerMethodField()
    # True when the calling user is allowed to edit the parent course
    # (superuser, owner, or manager). Drives the lesson-view "Edit"
    # affordance — kept consistent with the same flag on the course
    # detail serializer.
    can_manage = serializers.SerializerMethodField()
    # Neighbouring lessons in the parent course ordered by
    # ``(section.order, lesson.order)`` — drive the prev / next footer
    # navigation on the public lesson-view page. ``null`` at the
    # course boundaries.
    prev_lesson = serializers.SerializerMethodField()
    next_lesson = serializers.SerializerMethodField()
    # Localized parent section title for the lesson-view subtitle.
    section_title = serializers.SerializerMethodField()
    # Position breadcrumb: ``{current: int, total: int}`` of this
    # lesson within its section so the learner can see "Lesson 2/5".
    position_in_section = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            "id", "section", "course_id", "course_slug", "domain_id",
            "slug", "order", "is_preview", "is_published", "estimated_duration",
            "translations", "blocks", "available_lang_codes", "can_manage",
            "prev_lesson", "next_lesson",
            "section_title", "position_in_section",
        ]
        read_only_fields = [
            "id", "blocks", "course_id", "course_slug", "domain_id", "can_manage",
            "prev_lesson", "next_lesson",
            "section_title", "position_in_section",
        ]

    def get_available_lang_codes(self, obj):
        return sorted(obj.section.course.domain.allowed_languages.values_list("code", flat=True))

    @extend_schema_field(serializers.IntegerField())
    def get_course_id(self, obj) -> int:
        return obj.section.course_id

    @extend_schema_field(serializers.CharField())
    def get_course_slug(self, obj) -> str:
        return obj.section.course.slug

    @extend_schema_field(serializers.IntegerField())
    def get_domain_id(self, obj) -> int:
        return obj.section.course.domain_id

    @extend_schema_field(serializers.BooleanField())
    def get_can_manage(self, obj) -> bool:
        from .permissions import is_lms_instructor
        request = self.context.get("request")
        return bool(request and is_lms_instructor(request.user, obj.section.course))

    @extend_schema_field({
        "type": "object",
        "nullable": True,
        "properties": {
            "id": {"type": "integer"},
            "title": {"type": "string"},
        },
        "required": ["id", "title"],
    })
    def get_prev_lesson(self, obj):
        return self._neighbour(obj, direction=-1)

    @extend_schema_field({
        "type": "object",
        "nullable": True,
        "properties": {
            "id": {"type": "integer"},
            "title": {"type": "string"},
        },
        "required": ["id", "title"],
    })
    def get_next_lesson(self, obj):
        return self._neighbour(obj, direction=+1)

    @extend_schema_field(serializers.CharField())
    def get_section_title(self, obj) -> str:
        section = obj.section
        request = self.context.get("request")
        lang = getattr(getattr(request, "user", None), "language", None) or "fr"
        return (
            section.safe_translation_getter("title", language_code=lang, any_language=True)
            or f"Section #{section.pk}"
        )

    @extend_schema_field({
        "type": "object",
        "properties": {
            "current": {"type": "integer"},
            "total": {"type": "integer"},
        },
        "required": ["current", "total"],
    })
    def get_position_in_section(self, obj):
        from .models import Lesson
        section_lessons = list(
            Lesson.objects.filter(section_id=obj.section_id)
            .order_by("order", "id")
            .values_list("id", flat=True)
        )
        total = len(section_lessons)
        try:
            current = section_lessons.index(obj.id) + 1
        except ValueError:
            current = 0
        return {"current": current, "total": total}

    def _neighbour(self, obj, direction: int):
        """Return the ``(id, title)`` of the previous / next lesson in
        the parent course's ``(section.order, lesson.order)`` traversal,
        or ``None`` at the course boundary. Title is localized in the
        caller's UI language (falls back to any available translation).
        """
        from .models import Lesson  # local import to avoid module-level cycle
        course_id = obj.section.course_id
        all_lessons = list(
            Lesson.objects.filter(section__course_id=course_id)
            .select_related("section")
            .order_by("section__order", "order", "id")
            .values_list("id", flat=True)
        )
        try:
            idx = all_lessons.index(obj.id)
        except ValueError:
            return None
        target_idx = idx + direction
        if target_idx < 0 or target_idx >= len(all_lessons):
            return None
        target = Lesson.objects.filter(pk=all_lessons[target_idx]).first()
        if not target:
            return None
        request = self.context.get("request")
        lang = getattr(getattr(request, "user", None), "language", None) or "fr"
        title = target.safe_translation_getter("title", language_code=lang, any_language=True) or target.slug
        return {"id": target.id, "title": title}

    def create(self, validated_data):
        tr = validated_data.pop("translations", {})
        instance = Lesson.objects.create(**validated_data)
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
        course = instance.section.course
        tr_dict = _filter_allowed_lang_codes(tr_dict, course)
        for lang, fields in tr_dict.items():
            instance.set_current_language(lang)
            for k, v in fields.items():
                setattr(instance, k, v)
            instance.save()
        return instance


class SectionSerializer(serializers.ModelSerializer):
    translations = TranslationsField()
    available_lang_codes = serializers.SerializerMethodField()
    lessons = LessonDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Section
        fields = ["id", "course", "order", "is_published", "translations", "available_lang_codes", "lessons"]
        read_only_fields = ["id", "lessons"]

    def get_available_lang_codes(self, obj):
        return sorted(obj.course.domain.allowed_languages.values_list("code", flat=True))

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
    """Read-only audit row exposed by ``/api/lms/course/{id}/audit-log/``.

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

    class Meta:
        model = Course
        fields = [
            "id", "slug", "level", "language_code", "estimated_duration",
            "enrollment_mode", "is_published", "published_at",
            "cover_image", "translations", "domain",
            "lesson_count", "total_duration_minutes", "my_enrollment",
        ]

    @extend_schema_field(serializers.IntegerField())
    def get_lesson_count(self, obj) -> int:
        # The list view annotates ``lesson_count_db`` on the queryset
        # to avoid N+1; the retrieve view falls back to an explicit count.
        annotated = getattr(obj, "lesson_count_db", None)
        if annotated is not None:
            return int(annotated)
        from .models import Lesson
        return Lesson.objects.filter(section__course=obj).count()

    @extend_schema_field(serializers.IntegerField())
    def get_total_duration_minutes(self, obj) -> int:
        annotated = getattr(obj, "total_duration_db", None)
        if annotated is not None:
            return int(annotated or 0)
        from django.db.models import Sum
        from .models import Lesson
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
        from lms_enrollment.models import CourseEnrollment, CourseProgress, LessonProgress
        from .models import Lesson
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


class CourseDetailSerializer(CourseListSerializer):
    sections = SectionSerializer(many=True, read_only=True)
    available_lang_codes = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()
    my_pending_invite = serializers.SerializerMethodField()

    class Meta(CourseListSerializer.Meta):
        fields = CourseListSerializer.Meta.fields + [
            "sections", "available_lang_codes", "can_manage",
            "my_pending_invite", "created_at", "updated_at",
        ]

    def get_available_lang_codes(self, obj):
        return sorted(obj.domain.allowed_languages.values_list("code", flat=True))

    def get_can_manage(self, obj):
        from .permissions import is_lms_instructor
        request = self.context.get("request")
        return bool(request and is_lms_instructor(request.user, obj))

    @extend_schema_field({
        "type": "object",
        "nullable": True,
        "properties": {
            "id": {"type": "integer"},
            "token": {"type": "string"},
            "expires_at": {"type": "string", "format": "date-time"},
        },
        "required": ["id", "token", "expires_at"],
    })
    def get_my_pending_invite(self, obj):
        """Pending ``CourseInvite`` token for the calling user, if any.

        Exposed so the learner-facing course-detail page can swap its
        "Enroll" button for "Accept the invitation" without doing a
        second round-trip. Returns ``None`` for anonymous callers or
        when the user has no pending invitation on this course.
        """
        request = self.context.get("request")
        user = getattr(request, "user", None) if request is not None else None
        if user is None or not getattr(user, "is_authenticated", False):
            return None
        from lms_enrollment.models import CourseInvite
        invite = (
            CourseInvite.objects.filter(
                course=obj,
                invitee=user,
                status=CourseInvite.STATUS_PENDING,
            )
            .order_by("-created_at")
            .values("id", "token", "expires_at")
            .first()
        )
        if not invite:
            return None
        return {
            "id": invite["id"],
            "token": invite["token"],
            "expires_at": invite["expires_at"].isoformat(),
        }


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
