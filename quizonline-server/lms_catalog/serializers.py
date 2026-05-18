from django.utils.text import slugify
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from language.models import Language

from .models import ContentBlock, Course, Lesson, Section


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

    class Meta:
        model = Lesson
        fields = [
            "id", "section", "course_id", "course_slug", "slug", "order",
            "is_preview", "is_published", "estimated_duration",
            "translations", "blocks", "available_lang_codes", "can_manage",
            "prev_lesson", "next_lesson",
        ]
        read_only_fields = [
            "id", "blocks", "course_id", "course_slug", "can_manage",
            "prev_lesson", "next_lesson",
        ]

    def get_available_lang_codes(self, obj):
        return sorted(obj.section.course.domain.allowed_languages.values_list("code", flat=True))

    @extend_schema_field(serializers.IntegerField())
    def get_course_id(self, obj) -> int:
        return obj.section.course_id

    @extend_schema_field(serializers.CharField())
    def get_course_slug(self, obj) -> str:
        return obj.section.course.slug

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


class CourseListSerializer(serializers.ModelSerializer):
    translations = TranslationsField()
    language_code = serializers.SlugRelatedField(source="language", slug_field="code", read_only=True)

    class Meta:
        model = Course
        fields = [
            "id", "slug", "level", "language_code", "estimated_duration",
            "enrollment_mode", "is_published", "published_at",
            "cover_image", "translations", "domain",
        ]


class CourseDetailSerializer(CourseListSerializer):
    sections = SectionSerializer(many=True, read_only=True)
    available_lang_codes = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()

    class Meta(CourseListSerializer.Meta):
        fields = CourseListSerializer.Meta.fields + [
            "sections", "available_lang_codes", "can_manage", "created_at", "updated_at",
        ]

    def get_available_lang_codes(self, obj):
        return sorted(obj.domain.allowed_languages.values_list("code", flat=True))

    def get_can_manage(self, obj):
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
