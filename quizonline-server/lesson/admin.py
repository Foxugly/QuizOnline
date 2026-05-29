from django.contrib import admin
from parler.admin import TranslatableAdmin

from .models import Lesson


@admin.register(Lesson)
class LessonAdmin(TranslatableAdmin):
    """Admin for ``Lesson``.

    The previous in-page ``Block`` stacked inline went away with the
    Phase 2 polymorphic refactor: blocks no longer have a plain
    ``ForeignKey`` to ``Lesson``, they hang off a GenericForeignKey, and
    parler's stacked-inline helper does not transparently support
    GenericInline yet. The frontend lesson-edit page is the canonical
    block-editing surface anyway — keeping the admin lean avoids
    maintaining a parallel UI in two places.
    """

    list_display = ("id", "section", "order", "__str__", "is_preview", "is_published")
    list_filter = ("is_published", "is_preview", "section__course__domain")
    search_fields = ("translations__title", "slug")
    list_select_related = ("section", "section__course")
    autocomplete_fields = ("section",)
    ordering = ("section", "order")
