from __future__ import annotations

import logging
from datetime import timedelta

from celery.exceptions import Retry as CeleryRetry
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import OperationalError as DjangoOperationalError
from django.db import close_old_connections, connections, transaction
from django.utils import timezone
from kombu.exceptions import KombuError

from core.models import OutboundEmail

logger = logging.getLogger(__name__)


def _close_old_connections_if_safe() -> None:
    """
    ``close_old_connections`` avec un garde-fou : jamais dans une transaction.

    Recycler les connexions perimees est indispensable dans un worker Celery de
    longue duree, et c'est le cas d'usage normal de cette fonction. Mais fermer
    une connexion alors qu'une transaction est ouverte dessus n'est jamais
    correct : Django marque alors le connexion ``closed_in_transaction`` et
    toute requete suivante leve ``OperationalError: the connection is closed``.

    Ce n'etait pas visible en test parce que le runner utilise SQLite **en
    memoire**, dont le backend ignore deliberement ``close()`` (fermer
    detruirait la base). Sur PostgreSQL — donc en production — la fermeture est
    bien reelle. Chaque test qui declenchait un envoi d'e-mail tombait des que
    la suite a ete basculee sur PostgreSQL.

    En production le comportement est inchange : les appels viennent d'une tache
    Celery, hors de tout bloc atomique.
    """
    if any(conn.in_atomic_block for conn in connections.all(initialized_only=True)):
        return
    close_old_connections()


def process_pending_outbound_emails(*, limit: int = 100) -> int:
    sent = 0
    _close_old_connections_if_safe()
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
                    msg = EmailMultiAlternatives(
                        subject=email.subject,
                        body=email.body,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        to=email.recipients,
                    )
                    if email.html_body:
                        msg.attach_alternative(email.html_body, "text/html")
                    msg.send(fail_silently=False)
                except Exception as exc:  # pragma: no cover
                    email.last_error = str(exc)
                    email.available_at = timezone.now() + timedelta(minutes=1)
                    email.save(update_fields=["last_error", "available_at"])
                    logger.warning("email.delivery_failed", extra={"email_id": email.id, "error": str(exc)})
                    continue

                email.sent_at = timezone.now()
                email.last_error = ""
                email.save(update_fields=["sent_at", "last_error"])
                sent += 1
    finally:
        _close_old_connections_if_safe()
    return sent


def trigger_outbound_email_delivery() -> None:
    from core.tasks import deliver_outbound_emails_task

    try:
        deliver_outbound_emails_task.delay(limit=100)
    except (ConnectionError, OSError, KombuError) as exc:
        logger.warning("email.delivery_dispatch_failed", extra={"error": str(exc)})
        # Fall back to in-process delivery when the broker is unavailable so
        # registration and reset emails are still sent in degraded mode.
        process_pending_outbound_emails(limit=100)
    except (DjangoOperationalError, CeleryRetry) as exc:
        logger.warning("email.delivery_deferred", extra={"error": str(exc)})
        # SQLite can transiently lock during on_commit hooks in local/fullstack
        # runs. Leave the email queued instead of failing the originating request.
