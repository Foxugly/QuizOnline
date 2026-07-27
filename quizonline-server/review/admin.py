from django.contrib import admin

from .models import CourseReview


@admin.register(CourseReview)
class CourseReviewAdmin(admin.ModelAdmin):
    list_display = ("course", "user", "rating", "is_hidden", "created_at")
    list_filter = ("rating", "hidden_at")
    search_fields = ("user__email", "comment")
    raw_id_fields = ("course", "user", "hidden_by")
    readonly_fields = ("created_at", "updated_at")
