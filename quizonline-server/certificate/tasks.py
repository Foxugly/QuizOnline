"""Celery tasks for LMS certificates."""

from celery import shared_task
from django.core.files.base import ContentFile
from django.utils import timezone

from .models import Certificate
from .pdf_export import build_certificate_pdf


@shared_task
def render_certificate_pdf(cert_id: int) -> None:
    cert = Certificate.objects.get(pk=cert_id)
    payload = build_certificate_pdf(cert)
    cert.pdf.save(f"{cert.certificate_number}.pdf", ContentFile(payload), save=False)
    cert.pdf_rendered_at = timezone.now()
    cert.save(update_fields=["pdf", "pdf_rendered_at"])
