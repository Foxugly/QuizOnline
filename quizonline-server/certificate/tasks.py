"""Celery tasks for LMS certificates."""

import math
from datetime import timedelta

from celery import shared_task
from django.core.files.base import ContentFile
from django.utils import timezone

from .models import Certificate
from .notifications import notify_certificate_expiring
from .pdf_export import build_certificate_pdf


@shared_task
def render_certificate_pdf(cert_id: int) -> None:
    cert = Certificate.objects.get(pk=cert_id)
    payload = build_certificate_pdf(cert)
    cert.pdf.save(f"{cert.certificate_number}.pdf", ContentFile(payload), save=False)
    cert.pdf_rendered_at = timezone.now()
    cert.save(update_fields=["pdf", "pdf_rendered_at"])


# Two reminder milestones before ``expires_at``, on DISJOINT day-bands so a
# certificate is emailed at most once per milestone even on the first run:
#   - 30-day reminder for certificates expiring in (7, 30] days
#   - 7-day reminder  for certificates expiring in (0, 7]  days
# Idempotency is the per-row stamp, not the cadence — safe to run daily.
_REMINDER_MILESTONES = (
    (30, 7, "expiry_reminder_30d_sent_at"),
    (7, 0, "expiry_reminder_7d_sent_at"),
)


@shared_task
def send_certificate_expiry_reminders() -> int:
    """Email holders of certificates nearing expiry, nudging a renewal.
    Skips lifetime (``expires_at IS NULL``) and revoked certificates.
    Returns the number of reminder emails sent."""
    now = timezone.now()
    sent = 0
    for upper_days, lower_days, stamp_field in _REMINDER_MILESTONES:
        qs = Certificate.objects.filter(
            revoked_at__isnull=True,
            expires_at__gt=now + timedelta(days=lower_days),
            expires_at__lte=now + timedelta(days=upper_days),
            **{f"{stamp_field}__isnull": True},
        ).select_related("user", "course")
        for cert in qs:
            days = max(1, math.ceil((cert.expires_at - now).total_seconds() / 86400))
            # Stamp BEFORE sending: if the mail queue fails we skip a reminder
            # rather than loop-resending it every run.
            Certificate.objects.filter(pk=cert.pk).update(**{stamp_field: now})
            setattr(cert, stamp_field, now)
            notify_certificate_expiring(cert, days=days)
            sent += 1
    return sent
