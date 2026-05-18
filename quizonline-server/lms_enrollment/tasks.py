"""
Celery tasks for lms_enrollment.

Phase 6 (Task 28) replaces the body of ``render_certificate_pdf`` with the
real reportlab+Celery implementation. We register the placeholder now so
``issue_certificate_if_eligible`` can import it without a circular failure.
"""

from celery import shared_task


@shared_task
def render_certificate_pdf(cert_id: int) -> None:
    # Populated in Phase 6 (Task 28).
    return None
