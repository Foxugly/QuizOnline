from rest_framework import serializers

from .models import LessonQuiz


class LessonQuizSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonQuiz
        fields = [
            "id", "lesson", "course", "quiz_template",
            "required_score_percent", "is_required", "max_attempts",
            "unlock_next_lesson_on_success", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        instance = self.instance or LessonQuiz(**attrs)
        for k, v in attrs.items():
            setattr(instance, k, v)
        instance.full_clean()
        return attrs
