from rest_framework import serializers


# Upper bounds on a single batch translate call. These cap the size of the
# paid DeepL request a caller can trigger: at most ``MAX_BATCH_ITEMS`` items,
# each at most ``MAX_ITEM_CHARS`` characters. Tuned generously enough to cover
# a full multi-field translatable form in one shot, but small enough that a
# single request cannot run up an unbounded upstream bill.
MAX_BATCH_ITEMS = 50
MAX_ITEM_CHARS = 20000


class TranslateItemSerializer(serializers.Serializer):
    key = serializers.CharField()  # ex: "name", "description"
    text = serializers.CharField(allow_blank=True, required=True, max_length=MAX_ITEM_CHARS)
    format = serializers.ChoiceField(choices=["text", "html"], default="text")


class TranslateBatchRequestSerializer(serializers.Serializer):
    source = serializers.CharField(max_length=10)  # ex: "fr"
    target = serializers.CharField(max_length=10)  # ex: "nl"
    items = TranslateItemSerializer(many=True, max_length=MAX_BATCH_ITEMS)


class TranslateBatchResponseSerializer(serializers.Serializer):
    translations = serializers.DictField(child=serializers.CharField())
