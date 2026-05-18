from django.contrib import admin
from parler.admin import (
    TranslatableAdmin,
    TranslatableStackedInline,
    TranslatableTabularInline,
)

from .models import ContentBlock, Course, Lesson, Section


class ContentBlockInline(TranslatableStackedInline):
    model = ContentBlock
    extra = 0
    ordering = ("order",)
    fieldsets = (
        (None, {"fields": ("block_type", "order", "is_required", "title", "metadata")}),
        ("Rich text", {"fields": ("rich_text",), "classes": ("collapse",)}),
        ("Image", {"fields": ("image",), "classes": ("collapse",)}),
        ("Video", {"fields": ("video_url", "video_provider"), "classes": ("collapse",)}),
        ("File", {"fields": ("file",), "classes": ("collapse",)}),
        ("Quiz", {"fields": ("quiz_template",), "classes": ("collapse",)}),
        ("Callout", {"fields": ("callout_text",), "classes": ("collapse",)}),
        ("Code", {"fields": ("code_language", "code_content"), "classes": ("collapse",)}),
        ("Embed", {"fields": ("external_url",), "classes": ("collapse",)}),
    )


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


@admin.register(Lesson)
class LessonAdmin(TranslatableAdmin):
    list_display = ("id", "section", "order", "__str__", "is_preview", "is_published")
    list_filter = ("is_published", "is_preview", "section__course__domain")
    search_fields = ("translations__title", "slug")
    list_select_related = ("section", "section__course")
    autocomplete_fields = ("section",)
    inlines = [ContentBlockInline]
    ordering = ("section", "order")
