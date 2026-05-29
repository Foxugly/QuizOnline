"""Sentry ``before_send`` hooks.

Kept in a separate module so they can be unit-tested without importing
``settings_prod`` (which requires real production env vars).
"""

from __future__ import annotations

from typing import Any

REDIS_LOADING_MARKER = "Redis is loading the dataset in memory"


def drop_redis_loading_noise(event: dict[str, Any], hint: dict[str, Any]) -> dict[str, Any] | None:
    """Drop Celery reconnect events emitted while Redis loads its dump.

    Triggered when Redis restarts (typically by ``needrestart`` after an
    ``unattended-upgrades`` run): Redis answers ``LOADING`` for a couple of
    seconds while it reloads the RDB/AOF, Kombu logs the retry at ERROR,
    Celery's ensure-connection loop recovers within seconds. The event has
    no actionable signal, so we drop it. Any other broker error (refused,
    auth, network split) carries a different message and still flows
    through.
    """
    logentry = event.get("logentry") or {}
    if REDIS_LOADING_MARKER in (logentry.get("formatted") or ""):
        return None
    if REDIS_LOADING_MARKER in (logentry.get("message") or ""):
        return None
    for param in logentry.get("params") or ():
        if REDIS_LOADING_MARKER in str(param):
            return None
    return event
