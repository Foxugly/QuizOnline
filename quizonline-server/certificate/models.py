from django.conf import settings
from django.db import models
from django.db.models import Q


class CertificateSequence(models.Model):
    year = models.PositiveSmallIntegerField(primary_key=True)
    counter = models.PositiveIntegerField(default=0)


class Certificate(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="certificates")
    course = models.ForeignKey("course.Course", on_delete=models.PROTECT, related_name="certificates")
    issued_at = models.DateTimeField(auto_now_add=True)
    # Frozen at issue time from ``course.certificate_validity_months``.
    # ``NULL`` means "no expiration", matching ``validity_months == 0``.
    # Changing the course policy later does NOT shift this date — already-
    # issued certificates keep their original validity window.
    expires_at = models.DateTimeField(null=True, blank=True)
    certificate_number = models.CharField(max_length=32, unique=True)
    verification_token = models.CharField(max_length=64, unique=True, db_index=True)
    pdf = models.FileField(upload_to="lms/certificates/", blank=True, null=True)
    pdf_rendered_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoke_reason = models.TextField(blank=True)
    # Idempotency stamps for the expiry-reminder beat task: each milestone
    # (30 days / 7 days before ``expires_at``) is sent at most once. The task
    # excludes rows whose stamp is already set, so the cadence it runs at does
    # not matter — mirrors CourseInvite.reminder_sent_at.
    expiry_reminder_30d_sent_at = models.DateTimeField(null=True, blank=True)
    expiry_reminder_7d_sent_at = models.DateTimeField(null=True, blank=True)

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
