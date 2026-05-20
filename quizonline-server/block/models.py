from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _
from parler.managers import TranslatableManager
from parler.models import TranslatableModel, TranslatedFields

from .querysets import ContentBlockQuerySet


class ContentBlock(TranslatableModel):
    TYPE_RICH_TEXT = "rich_text"
    TYPE_IMAGE = "image"
    TYPE_VIDEO = "video"
    TYPE_FILE = "file"
    TYPE_QUIZ = "quiz"
    TYPE_CALLOUT = "callout"
    TYPE_CODE = "code"
    TYPE_EMBED = "embed"
    TYPE_CHOICES = [
        (TYPE_RICH_TEXT, _("Rich text")),
        (TYPE_IMAGE, _("Image")),
        (TYPE_VIDEO, _("Video")),
        (TYPE_FILE, _("File")),
        (TYPE_QUIZ, _("Quiz")),
        (TYPE_CALLOUT, _("Callout")),
        (TYPE_CODE, _("Code")),
        (TYPE_EMBED, _("Embed")),
    ]
    VIDEO_PROVIDER_CHOICES = [
        ("youtube", "YouTube"),
        ("vimeo", "Vimeo"),
        ("upload", _("Self-hosted")),
    ]

    lesson = models.ForeignKey(
        "lesson.Lesson", on_delete=models.CASCADE, related_name="blocks",
    )
    block_type = models.CharField(max_length=16, choices=TYPE_CHOICES)
    order = models.PositiveIntegerField(default=0, db_index=True)
    is_required = models.BooleanField(default=False)

    image = models.ImageField(upload_to="lms/blocks/img/", blank=True, null=True)
    video_url = models.URLField(blank=True)
    video_provider = models.CharField(max_length=16, choices=VIDEO_PROVIDER_CHOICES, blank=True)
    file = models.FileField(upload_to="lms/blocks/file/", blank=True, null=True)
    external_url = models.URLField(blank=True)
    code_language = models.CharField(max_length=32, blank=True)
    code_content = models.TextField(blank=True)
    quiz_template = models.ForeignKey(
        "quiz.QuizTemplate", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="content_blocks",
    )
    metadata = models.JSONField(default=dict, blank=True)

    translations = TranslatedFields(
        title=models.CharField(_("title"), max_length=200, blank=True),
        rich_text=models.TextField(_("rich text"), blank=True),
        callout_text=models.TextField(_("callout text"), blank=True),
    )

    objects = TranslatableManager.from_queryset(ContentBlockQuerySet)()

    class Meta:
        ordering = ["lesson", "order"]
        constraints = [
            models.UniqueConstraint(fields=["lesson", "order"], name="uniq_block_order_per_lesson"),
        ]

    def _has_translated_value(self, field: str) -> bool:
        """Check if a translated text field has a value, working for both saved and unsaved instances.

        ``safe_translation_getter(any_language=True)`` requires a PK because it queries
        related translations. For unsaved instances we inspect the in-memory cache.
        """
        # First try the saved-instance path; falls back to any cached language.
        if self.pk is not None:
            value = self.safe_translation_getter(field, any_language=True)
            if value:
                return True
        # Inspect parler's in-memory translation cache for unsaved/cached translations.
        meta = self._parler_meta._get_extension_by_field(field)
        local_cache = self._translations_cache.get(meta.model) or {}
        for translation in local_cache.values():
            if translation is None:
                continue
            value = getattr(translation, field, None)
            if value:
                return True
        return False

    def clean(self) -> None:
        super().clean()
        validators = {
            self.TYPE_RICH_TEXT: lambda: self._has_translated_value("rich_text"),
            self.TYPE_IMAGE: lambda: bool(self.image),
            self.TYPE_VIDEO: lambda: bool(self.video_url) and bool(self.video_provider),
            self.TYPE_FILE: lambda: bool(self.file),
            self.TYPE_QUIZ: lambda: self.quiz_template_id is not None,
            self.TYPE_CALLOUT: lambda: self._has_translated_value("callout_text"),
            self.TYPE_CODE: lambda: bool(self.code_content),
            self.TYPE_EMBED: lambda: bool(self.external_url),
        }
        check = validators.get(self.block_type)
        if check and not check():
            raise ValidationError({
                "block_type": _("ContentBlock of type %(t)s is missing its required payload.") % {"t": self.block_type},
            })
        if self.block_type == self.TYPE_QUIZ and self.quiz_template_id and self.lesson_id:
            course_domain_id = self.lesson.section.course.domain_id
            if self.quiz_template.domain_id != course_domain_id:
                raise ValidationError({
                    "quiz_template": _("Quiz must belong to the same domain as the course."),
                })

    def save(self, *args, **kwargs):
        if self.block_type == self.TYPE_RICH_TEXT and self.pk is not None:
            from .sanitizer import sanitize_rich_text
            for tr in list(self.translations.all()):
                cleaned = sanitize_rich_text(tr.rich_text or "")
                if cleaned != tr.rich_text:
                    tr.rich_text = cleaned
                    tr.save(update_fields=["rich_text"])
        super().save(*args, **kwargs)
