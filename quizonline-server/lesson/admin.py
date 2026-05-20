from django.contrib import admin
from parler.admin import TranslatableAdmin, TranslatableStackedInline

from block.models import ContentBlock

from .models import Lesson


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


@admin.register(Lesson)
class LessonAdmin(TranslatableAdmin):
    list_display = ("id", "section", "order", "__str__", "is_preview", "is_published")
    list_filter = ("is_published", "is_preview", "section__course__domain")
    search_fields = ("translations__title", "slug")
    list_select_related = ("section", "section__course")
    autocomplete_fields = ("section",)
    inlines = [ContentBlockInline]
    ordering = ("section", "order")
