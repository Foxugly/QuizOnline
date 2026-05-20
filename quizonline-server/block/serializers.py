from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers

from course.serializers import TranslationsField, _filter_allowed_lang_codes
from lesson.models import Lesson

from .models import Block


class _GenericHostField(serializers.PrimaryKeyRelatedField):
    """Base for the per-host wire fields (``lesson`` / ``question`` /
    ``answer_option``). Each subclass binds the field to a single host
    Django model and surfaces it as a flat PK on the wire while the
    underlying model stores ``(target_content_type, target_object_id)``.

    The serializer's ``create`` / ``update`` translate the value back
    into the GFK pair the model needs.
    """

    host_model = None  # type: ignore[assignment]

    def __init__(self, **kwargs):
        if self.host_model is None:
            raise NotImplementedError("Subclasses must set ``host_model``")
        kwargs.setdefault("queryset", self.host_model.objects.all())
        super().__init__(**kwargs)

    def get_attribute(self, instance):
        host_ct = ContentType.objects.get_for_model(self.host_model)
        if instance.target_content_type_id != host_ct.id:
            return None
        return instance.target

    def to_representation(self, value):
        if value is None:
            return None
        return value.pk


class LessonHostField(_GenericHostField):
    """Surface the polymorphic ``Block.target`` host as a plain
    ``lesson`` integer field on the wire when the host is a Lesson.

    Read path: walks the GFK; returns the lesson PK when the host is a
    Lesson (and ``None`` otherwise — for Question / AnswerOption hosts
    one of the sibling host fields below will fire instead).

    Write path: validates the value as a Lesson PK; the parent
    serializer's ``create`` / ``update`` translates the Lesson back
    into the ``(target_content_type, target_object_id)`` pair the
    model stores.
    """

    host_model = Lesson


class QuestionHostField(_GenericHostField):
    """Wire field ``question`` for Question-hosted blocks (prompt or
    explanation). Symmetric to :class:`LessonHostField`."""

    @property
    def host_model(self):  # lazy import to avoid app-load cycles
        from question.models import Question

        return Question


class AnswerOptionHostField(_GenericHostField):
    """Wire field ``answer_option`` for AnswerOption-hosted blocks."""

    @property
    def host_model(self):
        from question.models import AnswerOption

        return AnswerOption


# Map of wire field name -> host resolver. Used both at write time
# (to translate the incoming PK into a Django instance) and at read
# time (to surface the right host PK on the rendered payload).
_HOST_FIELDS: tuple[str, ...] = ("lesson", "question", "answer_option")


def _resolve_host_model(field_name: str):
    if field_name == "lesson":
        return Lesson
    if field_name == "question":
        from question.models import Question

        return Question
    if field_name == "answer_option":
        from question.models import AnswerOption

        return AnswerOption
    raise ValueError(f"Unknown host field {field_name!r}")


class BlockSerializer(serializers.ModelSerializer):
    """Serializer for :class:`Block`.

    The wire shape keeps a per-host integer field even though the
    underlying model is polymorphic (``target`` GFK). Each request body
    must include exactly one of ``lesson`` / ``question`` /
    ``answer_option`` on create — the serializer translates the value
    into the ``(target_content_type, target_object_id)`` pair the
    model now uses.

    Read responses include the field that matches the host's content
    type (``lesson`` for Lesson-hosted blocks, ``question`` for
    Question prompt / explanation blocks, ``answer_option`` for
    answer option body blocks). The other host fields render as
    ``null`` to keep the wire schema stable.
    """

    lesson = LessonHostField(required=False, allow_null=True)
    question = QuestionHostField(required=False, allow_null=True)
    answer_option = AnswerOptionHostField(required=False, allow_null=True)
    translations = TranslationsField()

    class Meta:
        model = Block
        fields = [
            "id", "lesson", "question", "answer_option",
            "block_type", "block_role", "order", "is_required",
            "image", "video_url", "video_provider", "file", "external_url",
            "code_language", "code_content", "quiz_template",
            "metadata", "translations",
        ]
        read_only_fields = ["id"]

    # -- host plumbing ---------------------------------------------------

    @staticmethod
    def _pop_host(validated_data: dict):
        """Pop the single non-null host value from ``validated_data``
        and return ``(field_name, instance)`` or ``(None, None)`` when
        none was provided. Raises if more than one was set, since the
        polymorphic host is exclusive.
        """
        present = [
            (name, validated_data.pop(name, None))
            for name in _HOST_FIELDS
        ]
        non_null = [(name, value) for name, value in present if value is not None]
        if len(non_null) > 1:
            raise serializers.ValidationError(
                "Provide exactly one of: lesson, question, answer_option."
            )
        if not non_null:
            return None, None
        return non_null[0]

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
            # On create, exactly one host must be provided. We don't pop
            # it here (``create`` will), but we surface the validation
            # error early so the caller gets a clean 400.
            provided = [name for name in _HOST_FIELDS if attrs.get(name) is not None]
            if not provided:
                raise serializers.ValidationError(
                    {"lesson": "Provide one of: lesson, question, answer_option."}
                )
            if len(provided) > 1:
                raise serializers.ValidationError(
                    "Provide exactly one of: lesson, question, answer_option."
                )
            return attrs

        instance = self.instance
        # ``lesson`` / ``question`` / ``answer_option`` are wire fields —
        # the model has no such attributes (only the GFK ``target``).
        # Translate before iterating and assigning the rest.
        host_field, host_instance = self._pop_host(attrs)
        if host_instance is not None:
            instance.target = host_instance

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

        if host_instance is not None:
            attrs[host_field] = host_instance

        instance.full_clean(
            exclude=["target_content_type", "target_object_id"]
            if not getattr(instance, "target_object_id", None)
            else None,
        )
        return attrs

    def create(self, validated_data):
        host_field, host_instance = self._pop_host(validated_data)
        tr = validated_data.pop("translations", {})
        if host_instance is None:
            raise serializers.ValidationError(
                {"lesson": "Provide one of: lesson, question, answer_option on create."}
            )
        host_ct = ContentType.objects.get_for_model(_resolve_host_model(host_field))
        instance = Block.objects.create(
            target_content_type=host_ct,
            target_object_id=host_instance.id,
            **validated_data,
        )
        return self._apply_translations(instance, tr)

    def update(self, instance, validated_data):
        _, host_instance = self._pop_host(validated_data)
        tr = validated_data.pop("translations", None)
        if host_instance is not None:
            instance.target = host_instance
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if tr is not None:
            self._apply_translations(instance, tr)
        return instance

    def _apply_translations(self, instance, tr_dict):
        from .sanitizer import sanitize_rich_text
        # Resolve the host's allowed-language set so translations land
        # only on languages the host's domain supports. Lessons walk
        # through their section / course; Question (and its
        # AnswerOption children) carry their own domain FK.
        host = instance.target
        course = host.section.course if hasattr(host, "section") else None
        if course is not None:
            tr_dict = _filter_allowed_lang_codes(tr_dict, course)
        else:
            # Question and AnswerOption hosts have no Course parent —
            # resolve the allowed language set directly from the
            # owning Question's domain.
            domain = None
            from question.models import AnswerOption, Question
            if isinstance(host, Question):
                domain = host.domain
            elif isinstance(host, AnswerOption):
                domain = host.question.domain
            if domain is not None:
                allowed = set(domain.allowed_languages.values_list("code", flat=True))
                if allowed:
                    tr_dict = {
                        lang: payload
                        for lang, payload in tr_dict.items()
                        if lang in allowed
                    }
        for lang, fields in tr_dict.items():
            if "rich_text" in fields:
                fields["rich_text"] = sanitize_rich_text(fields["rich_text"])
            instance.set_current_language(lang)
            for k, v in fields.items():
                setattr(instance, k, v)
            instance.save()
        return instance
