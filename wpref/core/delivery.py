from __future__ import annotations

import logging
import threading

from django.conf import settings
from django.core.mail import send_mail
from django.db import close_old_connections, transaction
from django.utils import timezone

from core.models import OutboundEmail

logger = logging.getLogger(__name__)

_delivery_lock = threading.Lock()
_delivery_running = False


def process_pending_outbound_emails(*, limit: int = 100) -> int:
    sent = 0
    close_old_connections()
    try:
        while sent < limit:
            with transaction.atomic():
                email = (
                    OutboundEmail.objects
                    .select_for_update(skip_locked=True)
                    .filter(sent_at__isnull=True, available_at__lte=timezone.now())
                    .order_by("created_at", "id")
                    .first()
                )
                if email is None:
                    break

                email.mark_attempt()
                try:
                    send_mail(
                        email.subject,
                        email.body,
                        settings.DEFAULT_FROM_EMAIL,
                        email.recipients,
                        fail_silently=False,
                    )
                except Exception as exc:  # pragma: no cover
                    email.last_error = str(exc)
                    email.save(update_fields=["attempts", "last_error"])
                    logger.warning("email.delivery_failed", extra={"email_id": email.id, "error": str(exc)})
                    continue

                email.sent_at = timezone.now()
                email.last_error = ""
                email.save(update_fields=["attempts", "sent_at", "last_error"])
                sent += 1
    finally:
        close_old_connections()
    return sent


def _delivery_worker() -> None:
    global _delivery_running
    try:
        process_pending_outbound_emails(limit=100)
    finally:
        with _delivery_lock:
            _delivery_running = False


def trigger_outbound_email_delivery() -> None:
    global _delivery_running
    if not getattr(settings, "EMAIL_DELIVERY_AUTOMATIC", True):
        return

    with _delivery_lock:
        if _delivery_running:
            return
        _delivery_running = True

    thread = threading.Thread(target=_delivery_worker, name="outbound-email-delivery", daemon=True)
    thread.start()
