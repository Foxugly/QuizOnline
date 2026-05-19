"""Celery tasks for lms_enrollment."""

from celery import shared_task
from django.core.files.base import ContentFile
from django.utils import timezone

from .models import Certificate, CourseInvite
from .pdf_export import build_certificate_pdf


@shared_task
def render_certificate_pdf(cert_id: int) -> None:
    cert = Certificate.objects.get(pk=cert_id)
    payload = build_certificate_pdf(cert)
    cert.pdf.save(f"{cert.certificate_number}.pdf", ContentFile(payload), save=False)
    cert.pdf_rendered_at = timezone.now()
    cert.save(update_fields=["pdf", "pdf_rendered_at"])


@shared_task
def expire_pending_course_invites() -> int:
    """Flip every pending ``CourseInvite`` past its ``expires_at``
    deadline to ``STATUS_EXPIRED``.

    Without this periodic sweep, rows only got their ``expired`` mark
    lazily when someone actually tried to accept them — meaning the
    instructor-facing invites table kept showing them as ``pending``
    forever, the catalog visibility filter kept exposing the course
    to invitees who could no longer accept, and the audit trail
    drifted from reality. Returns the count of rows updated so the
    Celery logs make the sweep visible.
    """
    now = timezone.now()
    return CourseInvite.objects.filter(
        status=CourseInvite.STATUS_PENDING,
        expires_at__lt=now,
    ).update(status=CourseInvite.STATUS_EXPIRED, updated_at=now)
