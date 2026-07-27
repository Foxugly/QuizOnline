from rest_framework import serializers

from .models import CourseReview


class CourseReviewSerializer(serializers.ModelSerializer):
    """Read serializer for a single review. ``hidden_at`` is only meaningful to
    an owner/manager (others never receive hidden rows)."""

    author_name = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = CourseReview
        fields = [
            "id", "author_name", "rating", "comment",
            "created_at", "updated_at", "is_mine", "hidden_at",
        ]
        read_only_fields = fields

    def get_author_name(self, obj) -> str:
        getter = getattr(obj.user, "get_display_name", None)
        return getter() if callable(getter) else obj.user.email

    def get_is_mine(self, obj) -> bool:
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and obj.user_id == request.user.id)


class CourseReviewWriteSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True)
    comment = serializers.CharField(required=False, allow_blank=True, default="")
