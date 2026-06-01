from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from core.serializers import TranslationsField, filter_allowed_lang_codes

from .models import Lesson


class LessonDetailSerializer(serializers.ModelSerializer):
    translations = TranslationsField()
    blocks = serializers.SerializerMethodField()
    available_lang_codes = serializers.SerializerMethodField()
    # Exposed read-only so the lesson-author shell can render a "Back to
    # course" affordance without a second round-trip through the section
    # endpoint just to look up the parent course id.
    course_id = serializers.SerializerMethodField()
    # Slug of the parent course — the public lesson-view back button
    # uses ``/course/{slug}`` rather than the id-based edit route.
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

    @extend_schema_field({"type": "array", "items": {"$ref": "#/components/schemas/Block"}})
    def get_blocks(self, obj):
        from block.serializers import BlockSerializer
        return BlockSerializer(obj.blocks.all(), many=True, context=self.context).data

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_available_lang_codes(self, obj) -> list[str]:
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
        from course.permissions import is_lms_instructor
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
        section_lessons = [
            lesson for lesson in self._course_lessons(obj.section.course_id)
            if lesson.section_id == obj.section_id
        ]
        total = len(section_lessons)
        try:
            current = next(i for i, lesson in enumerate(section_lessons) if lesson.id == obj.id) + 1
        except StopIteration:
            current = 0
        return {"current": current, "total": total}

    def _course_lessons(self, course_id: int) -> list:
        """Ordered list of every lesson in the parent course, cached on
        the serializer context. Used by ``_neighbour`` (×2 per lesson)
        and ``get_position_in_section`` — without the cache each call
        re-ran the same filter, which blew up to dozens of queries when
        ``CourseDetailSerializer`` nested this serializer per lesson.

        Translations are NOT prefetched here: parler's
        ``safe_translation_getter`` keeps its own per-instance
        ``_translations_cache`` that ``prefetch_related("translations")``
        does not populate, so prefetching would query the DB twice and
        still fall back to the slug on a cache miss. Leaving each title
        lookup to parler means at most one extra query per neighbour
        title, which still collapses the original O(N²) blow-up.
        """
        cache = self.context.setdefault("_course_lessons_cache", {})
        if course_id not in cache:
            cache[course_id] = list(
                Lesson.objects.filter(section__course_id=course_id)
                .select_related("section")
                .order_by("section__order", "order", "id")
            )
        return cache[course_id]

    def _neighbour(self, obj, direction: int):
        """Return the ``(id, title)`` of the previous / next lesson in
        the parent course's ``(section.order, lesson.order)`` traversal,
        or ``None`` at the course boundary. Title is localized in the
        caller's UI language (falls back to any available translation).
        """
        all_lessons = self._course_lessons(obj.section.course_id)
        try:
            idx = next(i for i, lesson in enumerate(all_lessons) if lesson.id == obj.id)
        except StopIteration:
            return None
        target_idx = idx + direction
        if target_idx < 0 or target_idx >= len(all_lessons):
            return None
        target = all_lessons[target_idx]
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
        tr_dict = filter_allowed_lang_codes(tr_dict, course)
        for lang, fields in tr_dict.items():
            instance.set_current_language(lang)
            for k, v in fields.items():
                setattr(instance, k, v)
            instance.save()
        return instance
