from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _
from parler.models import TranslatableModel, TranslatedFields

from config.models import AuditMixin


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

    class Meta:
        ordering = ["section", "order"]
        constraints = [
            models.UniqueConstraint(fields=["section", "slug"], name="uniq_lesson_slug_per_section"),
            models.UniqueConstraint(fields=["section", "order"], name="uniq_lesson_order_per_section"),
        ]

    def __str__(self) -> str:
        return self.safe_translation_getter("title", any_language=True) or f"Lesson #{self.pk}"
