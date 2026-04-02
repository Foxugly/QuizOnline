from __future__ import annotations

from celery import shared_task

from core.delivery import process_pending_outbound_emails


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 5},
)
def deliver_outbound_emails_task(self, *, limit: int = 100) -> int:
    return process_pending_outbound_emails(limit=limit)
