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
    consume in its ``create``/``update`` hook (see :func:`_filter_allowed_lang_codes`).
    """

    def to_representation(self, value):
        instance = value if hasattr(value, "translations") else self.parent.instance
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
