from rest_framework import serializers

from course.serializers import TranslationsField, _filter_allowed_lang_codes

from .models import ContentBlock


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
