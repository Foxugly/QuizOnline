from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers


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
    consume in its ``create``/``update`` hook (see :func:`filter_allowed_lang_codes`).
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


def filter_allowed_lang_codes(data: dict, host) -> dict:
    """Drop translation rows whose ``language_code`` is not in the host's
    domain's ``allowed_languages``. ``host`` is any model instance carrying
    a ``.domain.allowed_languages`` relation (Course, Lesson + parents
    walked by the caller, Question, …).

    Returns the empty dict unchanged so callers that intentionally pass
    ``{}`` (e.g. the "draft" create flow where the frontend posts a block
    with no content yet) never trip on a domain that has no language
    configured — that scenario should be flagged where actual content
    needs to land, not at the empty-draft handshake.
    """
    if not data:
        return data
    allowed = set(host.domain.allowed_languages.values_list("code", flat=True))
    if not allowed:
        raise serializers.ValidationError("Domain has no allowed_languages configured.")
    return {k: v for k, v in data.items() if k in allowed}


class TestEmailRequestSerializer(serializers.Serializer):
    to = serializers.EmailField()
    subject = serializers.CharField(required=False, allow_blank=True, max_length=255)
    body = serializers.CharField(required=False, allow_blank=True)


class TestEmailResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    email_id = serializers.IntegerField()
    recipients = serializers.ListField(child=serializers.EmailField())
    subject = serializers.CharField()
