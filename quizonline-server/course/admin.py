from django.contrib import admin
from parler.admin import TranslatableAdmin, TranslatableTabularInline

from lesson.models import Lesson

from .models import Course, Section


class LessonInline(TranslatableTabularInline):
    model = Lesson
    extra = 0
    ordering = ("order",)
    fields = ("order", "title", "slug", "is_preview", "is_published", "estimated_duration")
    show_change_link = True


class SectionInline(TranslatableTabularInline):
    model = Section
    extra = 0
    ordering = ("order",)
    fields = ("order", "title", "is_published")
    show_change_link = True


@admin.register(Course)
class CourseAdmin(TranslatableAdmin):
    list_display = ("id", "__str__", "domain", "level", "language", "is_published", "published_at", "updated_at")
    list_filter = ("is_published", "level", "domain", "language", "enrollment_mode")
    search_fields = ("translations__title", "translations__description", "slug")
    list_select_related = ("domain", "language")
    autocomplete_fields = ("domain", "language", "created_by", "updated_by")
    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by", "published_at")
    inlines = [SectionInline]
    fieldsets = (
        (None, {"fields": ("domain", "slug", "language", "level", "enrollment_mode", "cover_image")}),
        ("Translations", {"fields": ("title", "description", "learning_objectives")}),
        ("Status", {"fields": ("is_published", "published_at", "estimated_duration")}),
        ("Audit", {"fields": ("created_at", "created_by", "updated_at", "updated_by"), "classes": ("collapse",)}),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Section)
class SectionAdmin(TranslatableAdmin):
    list_display = ("id", "course", "order", "__str__", "is_published")
    list_filter = ("is_published", "course__domain")
    search_fields = ("translations__title", "course__translations__title")
    list_select_related = ("course",)
    autocomplete_fields = ("course",)
    inlines = [LessonInline]
    ordering = ("course", "order")
