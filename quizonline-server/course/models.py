from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from parler.managers import TranslatableManager
from parler.models import TranslatableModel, TranslatedFields

from config.models import AuditMixin, PublishableMixin

from .querysets import CourseQuerySet, SectionQuerySet


class Course(AuditMixin, PublishableMixin, TranslatableModel):
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
    # When False, completing the course does NOT issue a certificate even
    # if the learner reaches 100 % progress + final-quiz pass. Useful for
    # informational / optional courses where a certificate would be
    # misleading. Default True preserves the legacy behaviour.
    issues_certificate = models.BooleanField(default=True)
    # Validity window for the certificate, in months. ``0`` means
    # "no expiration" (current behaviour). The value is read once at
    # certificate issue time and frozen on the row — changing the policy
    # later does NOT retroactively expire already-issued certificates.
    certificate_validity_months = models.PositiveSmallIntegerField(
        default=0,
        help_text=_("0 = no expiration."),
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

    def publish(self):
        self.is_published = True
        self.published_at = timezone.now()

    def unpublish(self):
        self.is_published = False
        self.published_at = None


class CourseAuditLog(models.Model):
    """Append-only audit trail of meaningful actions on a course.

    Same shape as ``domain.DomainAuditLog`` so the operator stays in
    familiar territory: ``action`` is a free-form string
    (``"course.publish"``, ``"course.unpublish"``, ``"course.clone"``,
    ``"course.delete"``, …) and ``metadata`` is a JSON blob with the
    per-action context. Adding an audit-worthy action does not require
    a migration.

    The ``(course, -created_at)`` index supports the common
    "show me the last N actions on this course" query that backs the
    audit-log tab in ``/course/{id}/edit``.
    """
    from django.conf import settings as _settings

    ACTION_MAX_LENGTH = 64

    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="audit_logs",
    )
    actor = models.ForeignKey(
        _settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="emitted_course_audit_logs",
    )
    action = models.CharField(max_length=ACTION_MAX_LENGTH, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["course", "-created_at"], name="course_audit_course_ct_idx"),
        ]
        ordering = ["-created_at"]


class Section(PublishableMixin, TranslatableModel):
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
