from django.contrib import admin

from .models import LessonQuiz


@admin.register(LessonQuiz)
class LessonQuizAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "target_display",
        "quiz_template",
        "required_score_percent",
        "max_attempts",
    )
    list_filter = ("lesson__section__course__domain",)
    autocomplete_fields = ("lesson", "course", "quiz_template")

    @admin.display(description="Target")
    def target_display(self, obj):
        if obj.lesson_id:
            return f"Lesson:{obj.lesson_id}"
        return f"Course:{obj.course_id} (final)"
