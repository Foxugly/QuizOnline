from django.contrib import admin

from .models import Certificate, CourseEnrollment, CourseProgress, LessonProgress


@admin.register(CourseEnrollment)
class CourseEnrollmentAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "course", "status", "enrolled_at", "completed_at")
    list_filter = ("status", "course__domain")
    search_fields = ("user__email", "user__username", "course__translations__title")
    list_select_related = ("user", "course")
    autocomplete_fields = ("user", "course")
    readonly_fields = ("enrolled_at", "completed_at", "created_by", "updated_by")


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "lesson", "is_started", "is_completed", "progress_percent", "last_seen_at")
    list_filter = ("is_completed", "is_started", "lesson__section__course__domain")
    search_fields = ("user__email", "lesson__translations__title")
    list_select_related = ("user", "lesson")
    autocomplete_fields = ("user", "lesson")
    readonly_fields = ("started_at", "completed_at", "last_seen_at")


@admin.register(CourseProgress)
class CourseProgressAdmin(admin.ModelAdmin):
    list_display = ("user", "course", "progress_percent", "completed_lessons_count", "total_lessons_count", "updated_at")
    list_filter = ("course__domain",)
    list_select_related = ("user", "course")
    readonly_fields = ("updated_at",)


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ("certificate_number", "user", "course", "issued_at", "pdf_rendered_at", "revoked_at")
    list_filter = ("course__domain", "revoked_at")
    search_fields = ("certificate_number", "user__email")
    readonly_fields = ("certificate_number", "verification_token", "pdf", "pdf_rendered_at", "issued_at")
