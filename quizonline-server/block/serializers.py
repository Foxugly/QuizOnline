from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers

from course.serializers import TranslationsField, _filter_allowed_lang_codes
from lesson.models import Lesson

from .models import Block


class LessonHostField(serializers.PrimaryKeyRelatedField):
    """Surface the polymorphic ``Block.target`` host as a plain
    ``lesson`` integer field on the wire.

    Read path: walks the GFK; returns the lesson PK when the host is a
    Lesson (and ``None`` otherwise — Phase 3 will add Question /
    AnswerOption hosts).

    Write path: validates the value as a Lesson PK; the parent
    serializer's ``create`` / ``update`` translates the Lesson back
    into the ``(target_content_type, target_object_id)`` pair the
    model stores.

    Keeping the wire field named ``lesson`` (instead of inventing a
    new ``target_id``) preserves the pre-Phase-2 OpenAPI contract so
    no frontend client needs touching for Phase 2 — only the schema
    name flips from ``ContentBlock`` to ``Block``.
    """

    def __init__(self, **kwargs):
        kwargs.setdefault("queryset", Lesson.objects.all())
        super().__init__(**kwargs)

    def get_attribute(self, instance):
        # ``instance`` is the Block; resolve the GFK and return the
        # Lesson when the host is one — otherwise None.
        lesson_ct = ContentType.objects.get_for_model(Lesson)
        if instance.target_content_type_id != lesson_ct.id:
            return None
        return instance.target

    def to_representation(self, value):
        if value is None:
            return None
        return value.pk


class BlockSerializer(serializers.ModelSerializer):
    """Serializer for :class:`Block`.

    The wire shape keeps a plain ``lesson`` integer field even though
    the underlying model is now polymorphic (``target`` GFK). This is
    deliberate (Phase 2 plan, Option B): existing API clients continue
    to POST / PATCH ``{"lesson": <id>, ...}`` while the serializer
    quietly translates the value into the ``(target_content_type,
    target_object_id)`` pair the model now uses.

    Phase 4 (URL flattening) will revisit whether to expose a more
    generic ``{"target_type", "target_id"}`` shape on the wire.
    """

    lesson = LessonHostField()
    translations = TranslationsField()

    class Meta:
        model = Block
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
        # rejected. ``Block.clean()`` still runs on every UPDATE below, and
        # Django admin keeps calling ``full_clean()`` directly, so the
        # per-type validators remain enforced everywhere else.
        if self.instance is None:
            return attrs

        instance = self.instance
        # ``lesson`` is the wire field — the model has no ``lesson``
        # attribute (only the GFK ``target``). Translate before
        # iterating and assigning the rest.
        lesson_override = attrs.pop("lesson", None)
        if lesson_override is not None:
            instance.target = lesson_override

        for k, v in attrs.items():
            if k != "translations":
                setattr(instance, k, v)

        # Fold incoming translations into parler's in-memory cache so that
        # ``Block.clean()._has_translated_value(...)`` sees the caller's
        # brand-new ``rich_text`` / ``callout_text`` value during
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

        if lesson_override is not None:
            attrs["lesson"] = lesson_override

        instance.full_clean(
            exclude=["target_content_type", "target_object_id"]
            if not getattr(instance, "target_object_id", None)
            else None,
        )
        return attrs

    def create(self, validated_data):
        lesson = validated_data.pop("lesson", None)
        tr = validated_data.pop("translations", {})
        if lesson is None:
            raise serializers.ValidationError({"lesson": "This field is required on create."})
        lesson_ct = ContentType.objects.get_for_model(Lesson)
        instance = Block.objects.create(
            target_content_type=lesson_ct,
            target_object_id=lesson.id,
            **validated_data,
        )
        return self._apply_translations(instance, tr)

    def update(self, instance, validated_data):
        lesson = validated_data.pop("lesson", None)
        tr = validated_data.pop("translations", None)
        if lesson is not None:
            instance.target = lesson
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if tr is not None:
            self._apply_translations(instance, tr)
        return instance

    def _apply_translations(self, instance, tr_dict):
        from .sanitizer import sanitize_rich_text
        # Today the host is always a Lesson; Phase 3 will branch on the
        # GFK target type to fetch the host's allowed language set.
        host = instance.target
        course = host.section.course if hasattr(host, "section") else None
        if course is not None:
            tr_dict = _filter_allowed_lang_codes(tr_dict, course)
        for lang, fields in tr_dict.items():
            if "rich_text" in fields:
                fields["rich_text"] = sanitize_rich_text(fields["rich_text"])
            instance.set_current_language(lang)
            for k, v in fields.items():
                setattr(instance, k, v)
            instance.save()
        return instance
