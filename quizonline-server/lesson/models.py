from django.contrib.contenttypes.fields import GenericRelation
from django.db import models
from django.utils.translation import gettext_lazy as _
from parler.managers import TranslatableManager
from parler.models import TranslatableModel, TranslatedFields

from .querysets import LessonQuerySet


class Lesson(TranslatableModel):
    section = models.ForeignKey(
        "course.Section", on_delete=models.CASCADE, related_name="lessons",
    )
    slug = models.SlugField(max_length=220)
    order = models.PositiveIntegerField(default=0, db_index=True)
    is_preview = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)
    estimated_duration = models.PositiveIntegerField(default=0)

    # Polymorphic block host (Phase 2 of the LMS refactor). Mirrors the
    # ``Block.target`` GFK so ``lesson.blocks.all()`` keeps working and
    # ``Block.objects.filter(lesson__section__course=course)`` still
    # resolves through the ``related_query_name="lesson"`` alias.
    blocks = GenericRelation(
        "block.Block",
        content_type_field="target_content_type",
        object_id_field="target_object_id",
        related_query_name="lesson",
    )

    translations = TranslatedFields(
        title=models.CharField(_("title"), max_length=200),
        short_description=models.TextField(_("short description"), blank=True),
    )

    objects = TranslatableManager.from_queryset(LessonQuerySet)()

    class Meta:
        ordering = ["section", "order"]
        constraints = [
            models.UniqueConstraint(fields=["section", "slug"], name="uniq_lesson_slug_per_section"),
            models.UniqueConstraint(fields=["section", "order"], name="uniq_lesson_order_per_section"),
        ]

    def __str__(self) -> str:
        return self.safe_translation_getter("title", any_language=True) or f"Lesson #{self.pk}"
