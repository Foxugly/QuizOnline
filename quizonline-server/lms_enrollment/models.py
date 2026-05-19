import secrets
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from config.models import AuditMixin


COURSE_INVITE_DEFAULT_TTL_DAYS = 14


def _generate_course_invite_token() -> str:
    return secrets.token_urlsafe(32)


def _default_course_invite_expiry():
    return timezone.now() + timedelta(days=COURSE_INVITE_DEFAULT_TTL_DAYS)


class CourseEnrollment(AuditMixin, models.Model):
    STATUS_PENDING = "pending"
    STATUS_ACTIVE = "active"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_PENDING, _("Pending approval")),
        (STATUS_ACTIVE, _("Active")),
        (STATUS_COMPLETED, _("Completed")),
        (STATUS_CANCELLED, _("Cancelled")),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="course_enrollments")
    course = models.ForeignKey("lms_catalog.Course", on_delete=models.CASCADE, related_name="enrollments")
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "course"], name="uniq_enrollment_per_user_course"),
        ]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["course", "status"]),
        ]


class LessonProgress(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lesson_progress")
    lesson = models.ForeignKey("lms_catalog.Lesson", on_delete=models.CASCADE, related_name="user_progress")
    is_started = models.BooleanField(default=False)
    is_completed = models.BooleanField(default=False)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_seen_at = models.DateTimeField(auto_now=True)
    progress_percent = models.PositiveSmallIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "lesson"], name="uniq_progress_per_user_lesson"),
        ]
        indexes = [models.Index(fields=["user", "is_completed"])]


class CourseProgress(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="course_progress")
    course = models.ForeignKey("lms_catalog.Course", on_delete=models.CASCADE, related_name="user_progress")
    completed_lessons_count = models.PositiveIntegerField(default=0)
    total_lessons_count = models.PositiveIntegerField(default=0)
    progress_percent = models.PositiveSmallIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "course"], name="uniq_course_progress_per_user_course"),
        ]


class CertificateSequence(models.Model):
    year = models.PositiveSmallIntegerField(primary_key=True)
    counter = models.PositiveIntegerField(default=0)


class Certificate(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="certificates")
    course = models.ForeignKey("lms_catalog.Course", on_delete=models.PROTECT, related_name="certificates")
    issued_at = models.DateTimeField(auto_now_add=True)
    certificate_number = models.CharField(max_length=32, unique=True)
    verification_token = models.CharField(max_length=64, unique=True, db_index=True)
    pdf = models.FileField(upload_to="lms/certificates/", blank=True, null=True)
    pdf_rendered_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoke_reason = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "course"],
                condition=Q(revoked_at__isnull=True),
                name="uniq_active_cert_per_user_course",
            ),
        ]

    def __str__(self) -> str:
        return self.certificate_number


class CourseInvite(AuditMixin, models.Model):
    """
    Outstanding invitation for a domain member to join a specific
    ``ENROLL_INVITE`` course.

    Instructors can only invite users who are already members of the
    course's domain, so the invitee is always a registered
    :class:`CustomUser` — the model carries a ``invitee`` FK rather
    than a raw email. Persisting one row per pending invitation gives
    us four properties beyond a stateless "send email and hope":

    1. **Resend**: an instructor who lost the original mail can re-send
       without remembering whom they invited.
    2. **Revoke**: an instructor who changes their mind can mark the
       row revoked; the accept endpoint cross-checks the row state
       so the token alone is not enough.
    3. **Audit / dashboard**: visible list of "I invited 3 learners,
       1 accepted, 2 still pending."
    4. **Visibility**: the LMS catalog / detail querysets filter on
       the presence of a PENDING invite so invite-only courses
       are exposed only to the invited learners.

    Only one PENDING row per ``(course, invitee)`` couple at a time —
    the partial unique constraint kicks in on the second insert and
    the invite view re-uses (and bumps ``last_sent_at`` on) the
    existing row instead.
    """

    STATUS_PENDING = "pending"
    STATUS_ACCEPTED = "accepted"
    STATUS_DECLINED = "declined"
    STATUS_REVOKED = "revoked"
    STATUS_EXPIRED = "expired"
    STATUS_CHOICES = [
        (STATUS_PENDING, _("Pending")),
        (STATUS_ACCEPTED, _("Accepted")),
        (STATUS_DECLINED, _("Declined")),
        (STATUS_REVOKED, _("Revoked")),
        (STATUS_EXPIRED, _("Expired")),
    ]

    course = models.ForeignKey(
        "lms_catalog.Course",
        on_delete=models.CASCADE,
        related_name="invites",
    )
    invitee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_course_invites",
    )
    # The inviter is carried by ``AuditMixin.created_by`` — no extra
    # FK needed. Code that needs "who sent this" should read
    # ``invite.created_by`` directly.
    status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
    )
    token = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        default=_generate_course_invite_token,
    )
    # Pre-computed for cheap "which invites expire soon" queries and as
    # a fast denial signal before bothering with row-state checks.
    expires_at = models.DateTimeField(default=_default_course_invite_expiry)
    # Bumped each time we re-send the mail; useful for audit and for
    # cron-driven "remind invitees who never clicked" jobs.
    last_sent_at = models.DateTimeField(auto_now_add=True)
    # Stamped by :func:`lms_enrollment.tasks.send_course_invite_reminders`
    # the first time the J-3 (configurable via
    # :setting:`LMS_COURSE_INVITE_REMINDER_HOURS_BEFORE`) expiration
    # reminder fires. NULL means "no reminder sent yet" — the sweep
    # filters on this so an invitee never receives more than one
    # reminder per invitation, even if the cron runs every hour. Also
    # zeroed by :func:`resend_course_invite` so a manual resend resets
    # the reminder clock for the new ``expires_at``.
    reminder_sent_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    declined_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["course", "invitee"],
                condition=Q(status="pending"),
                name="uniq_pending_course_invite_per_course_invitee",
            ),
        ]
        indexes = [
            models.Index(
                fields=["invitee", "status"],
                name="course_inv_user_status_idx",
            ),
            models.Index(
                fields=["course", "status"],
                name="course_inv_course_st_idx",
            ),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return (
            f"CourseInvite(course={self.course_id}, "
            f"invitee={self.invitee_id}, status={self.status})"
        )

    @property
    def is_pending(self) -> bool:
        return self.status == self.STATUS_PENDING

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at


class LessonNote(models.Model):
    """Private per-learner notes attached to a lesson. One row per
    ``(user, lesson)`` couple — the learner edits a single
    long-form note rather than a chronological list of entries,
    which mirrors how authors take notes while watching a lesson."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="lesson_notes",
    )
    lesson = models.ForeignKey(
        "lms_catalog.Lesson",
        on_delete=models.CASCADE,
        related_name="user_notes",
    )
    content = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "lesson"], name="uniq_lesson_note_per_user_lesson",
            ),
        ]
        indexes = [models.Index(fields=["user", "lesson"])]
