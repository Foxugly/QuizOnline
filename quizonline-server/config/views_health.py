"""
Enriched health endpoint.

Three layered checks:
- ``db``     — issues ``SELECT 1`` on the default DB connection.
- ``cache``  — round-trips a short-lived key through Django's cache.
- ``outbox`` — counts pending ``OutboundEmail`` rows; surfaced as a
  metric rather than a binary status because a few queued mails is
  normal, and a load balancer should not flip the node out of rotation
  just because Celery is briefly behind.

The endpoint returns ``200`` when ``db`` and ``cache`` both pass,
``503`` otherwise. The outbox count is informational only.

Keeping the payload backward-compatible: ``status`` at the top level is
still ``"ok"`` or now ``"degraded"`` so existing uptime checks that
only assert ``status == "ok"`` still flip when something breaks.
"""
from __future__ import annotations

import logging
import os
from typing import Any

from django.core.cache import cache
from django.db import DatabaseError, connection
from django.http import JsonResponse

logger = logging.getLogger(__name__)


def _resolve_version() -> str:
    """
    Best-effort build/release identifier rendered in ``/health/`` so the
    operator can confirm which build is actually running on a node.

    Resolution order:
      1. ``SENTRY_RELEASE`` — already used by the Sentry SDK and
         typically set in CI/CD to the git SHA. Same source of truth.
      2. ``APP_VERSION`` — explicit override if Sentry isn't configured.
      3. ``"unknown"`` — never raise; the endpoint must remain cheap.
    """
    return (os.environ.get("SENTRY_RELEASE")
            or os.environ.get("APP_VERSION")
            or "unknown").strip() or "unknown"

_CACHE_PROBE_KEY = "_healthcheck:probe"
_CACHE_PROBE_VALUE = "1"
_CACHE_PROBE_TTL_SECONDS = 5


def _check_db() -> tuple[bool, str | None]:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except DatabaseError as exc:  # pragma: no cover - DB failure path
        logger.warning("healthcheck.db.failed", exc_info=True)
        return False, str(exc)
    return True, None


def _check_cache() -> tuple[bool, str | None]:
    try:
        cache.set(_CACHE_PROBE_KEY, _CACHE_PROBE_VALUE, _CACHE_PROBE_TTL_SECONDS)
        if cache.get(_CACHE_PROBE_KEY) != _CACHE_PROBE_VALUE:
            return False, "round-trip mismatch"
    except Exception as exc:  # pragma: no cover - cache failure path
        logger.warning("healthcheck.cache.failed", exc_info=True)
        return False, str(exc)
    return True, None


def _outbox_pending_count() -> int:
    # Lazy import keeps a circular-import risk away from settings load.
    try:
        from core.models import OutboundEmail
    except Exception:  # pragma: no cover - very defensive
        return -1
    try:
        return OutboundEmail.objects.filter(sent_at__isnull=True).count()
    except DatabaseError:  # pragma: no cover - covered by db check above
        return -1


def health_check(request) -> JsonResponse:
    db_ok, db_err = _check_db()
    cache_ok, cache_err = _check_cache()
    outbox_pending = _outbox_pending_count()

    overall_ok = db_ok and cache_ok
    payload: dict[str, Any] = {
        "status": "ok" if overall_ok else "degraded",
        "version": _resolve_version(),
        "checks": {
            "db": {"ok": db_ok, **({"error": db_err} if db_err else {})},
            "cache": {"ok": cache_ok, **({"error": cache_err} if cache_err else {})},
        },
        "outbox_pending": outbox_pending,
    }
    return JsonResponse(payload, status=200 if overall_ok else 503)
