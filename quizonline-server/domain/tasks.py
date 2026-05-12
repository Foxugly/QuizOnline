from __future__ import annotations

from celery import shared_task

from domain.services import (
    auto_decline_stale_pending_requests,
    send_expiring_join_request_warnings,
)


@shared_task
def auto_decline_stale_join_requests_task(*, older_than_days: int = 30) -> int:
    """
    Periodic Celery beat task: mark long-stale pending domain-join
    requests as cancelled so the moderation queue does not accumulate
    forgotten rows. Returns the count of updated rows.
    """
    return auto_decline_stale_pending_requests(older_than_days=older_than_days)


@shared_task
def send_expiring_join_request_warnings_task(
    *, auto_decline_days: int = 30, warn_days_before: int = 3,
) -> int:
    """
    Periodic Celery beat task: email the requester of every pending
    join request that is about to be auto-cancelled, once per row.
    Returns the count of warnings actually sent.
    """
    return send_expiring_join_request_warnings(
        auto_decline_days=auto_decline_days,
        warn_days_before=warn_days_before,
    )
