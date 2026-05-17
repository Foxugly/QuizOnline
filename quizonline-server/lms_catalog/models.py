from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _
from parler.managers import TranslatableManager
from parler.models import TranslatableModel, TranslatedFields

from config.models import AuditMixin

from .querysets import (
    ContentBlockQuerySet,
    CourseQuerySet,
    LessonQuerySet,
    SectionQuerySet,
)


class Course(AuditMixin, TranslatableModel):
    LEVEL_BEGINNER = "beginner"
    LEVEL_INTERMEDIATE = "intermediate"
    LEVEL_ADVANCED = "advanced"
    LEVEL_CHOICES = [
        (LEVEL_BEGINNER, _("Beginner")),
        (LEVEL_INTERMEDIATE, _("Intermediate")),
        (LEVEL_ADVANCED, _("Advanced")),
    ]

    ENROLL_OPEN = "open"
    ENROLL_APPROVAL = "approval"
    ENROLL_INVITE = "invite"
    ENROLLMENT_MODE_CHOICES = [
        (ENROLL_OPEN, _("Open enrollment")),
        (ENROLL_APPROVAL, _("Requires approval")),
        (ENROLL_INVITE, _("Invite-only")),
    ]

    domain = models.ForeignKey(
        "domain.Domain", on_delete=models.PROTECT, related_name="courses",
    )
    slug = models.SlugField(max_length=220, unique=True)
    cover_image = models.ImageField(upload_to="lms/covers/", blank=True, null=True)
    level = models.CharField(max_length=16, choices=LEVEL_CHOICES, default=LEVEL_BEGINNER)
    language = models.ForeignKey(
        "language.Language", on_delete=models.PROTECT, related_name="courses",
        help_text=_("Primary language of the course."),
    )
    estimated_duration = models.PositiveIntegerField(
        default=0, help_text=_("Total expected duration in minutes."),
    )
    enrollment_mode = models.CharField(
        max_length=16, choices=ENROLLMENT_MODE_CHOICES, default=ENROLL_OPEN,
    )
    is_published = models.BooleanField(default=False, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    translations = TranslatedFields(
        title=models.CharField(_("title"), max_length=200),
        description=models.TextField(_("description"), blank=True),
        learning_objectives=models.TextField(_("learning objectives"), blank=True),
    )

    objects = TranslatableManager.from_queryset(CourseQuerySet)()

    class Meta:
        ordering = ["-published_at", "-created_at"]
        indexes = [
            models.Index(fields=["domain", "is_published"]),
            models.Index(fields=["slug"]),
        ]

    def __str__(self) -> str:
        return self.safe_translation_getter("title", any_language=True) or f"Course #{self.pk}"

    def clean(self) -> None:
        super().clean()
        if self.is_published and not self.published_at:
            raise ValidationError(_("Published courses must have published_at set."))
        if self.domain_id and self.language_id:
            allowed_ids = set(self.domain.allowed_languages.values_list("id", flat=True))
            if not allowed_ids:
                raise ValidationError(_("Configure allowed_languages on the domain before creating courses."))
            if self.language_id not in allowed_ids:
                raise ValidationError({
                    "language": _("Course primary language must be one of the domain's allowed languages."),
                })


class Section(TranslatableModel):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="sections")
    order = models.PositiveIntegerField(default=0, db_index=True)
    is_published = models.BooleanField(default=False)

    translations = TranslatedFields(
        title=models.CharField(_("title"), max_length=200),
        description=models.TextField(_("description"), blank=True),
    )

    objects = TranslatableManager.from_queryset(SectionQuerySet)()

    class Meta:
        ordering = ["course", "order"]
        constraints = [
            models.UniqueConstraint(fields=["course", "order"], name="uniq_section_order_per_course"),
        ]

    def __str__(self) -> str:
        return self.safe_translation_getter("title", any_language=True) or f"Section #{self.pk}"


class Lesson(TranslatableModel):
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name="lessons")
    slug = models.SlugField(max_length=220)
    order = models.PositiveIntegerField(default=0, db_index=True)
    is_preview = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)
    estimated_duration = models.PositiveIntegerField(default=0)

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

    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="blocks")
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
