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
