from __future__ import annotations

from celery import shared_task

from domain.services import auto_decline_stale_pending_requests


@shared_task
def auto_decline_stale_join_requests_task(*, older_than_days: int = 30) -> int:
    """
    Periodic Celery beat task: mark long-stale pending domain-join
    requests as cancelled so the moderation queue does not accumulate
    forgotten rows. Returns the count of updated rows.
    """
    return auto_decline_stale_pending_requests(older_than_days=older_than_days)
