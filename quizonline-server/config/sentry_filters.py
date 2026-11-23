"""Sentry ``before_send`` hooks.

Kept in a separate module so they can be unit-tested without importing
``settings_prod`` (which requires real production env vars).
"""

from __future__ import annotations

from typing import Any

from django.core.exceptions import DisallowedHost
from sentry_sdk.scrubber import EventScrubber

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


def drop_disallowed_host(event: dict[str, Any], hint: dict[str, Any]) -> dict[str, Any] | None:
    """Drop benign ``DisallowedHost`` (HTTP 400) noise.

    Internet scanners, uptime probes and direct-IP ``curl``s reach the box with
    an empty or spoofed ``Host`` header; Django correctly rejects them with a
    400 ``DisallowedHost``. That rejection is the intended behaviour, not an
    error worth paging on, so we drop it instead of letting it flood Sentry. Do
    NOT "fix" this by widening ``ALLOWED_HOSTS`` — that would make Django serve
    Host-spoofed requests.
    """
    exc = hint.get("exc_info")
    if exc and isinstance(exc[1], DisallowedHost):
        return None
    return event


def drop_benign_noise(event: dict[str, Any], hint: dict[str, Any]) -> dict[str, Any] | None:
    """Composite ``before_send``: chain the benign-noise filters; if any drops
    the event (returns ``None``), it is dropped."""
    if drop_disallowed_host(event, hint) is None:
        return None
    return drop_redis_loading_noise(event, hint)


#: What the SDK may collect, replacing the deprecated ``send_default_pii=False``
#: (sentry-sdk 2.76). Never more than before: no user (id, e-mail, IP), no
#: cookies, no request or response bodies, no Celery task arguments, no SQL
#: parameters; headers, query strings and local variables go through the SDK's
#: sensitive-key denylist, plus the proxy/IP header terms the SDK itself uses
#: when it maps ``send_default_pii=False``.
_PII_TERMS = ["forwarded", "-ip", "remote-", "via", "-user"]
DATA_COLLECTION: dict[str, Any] = {
    "user_info": False,
    "cookies": {"mode": "off"},
    "http_headers": {"request": {"mode": "denylist", "terms": _PII_TERMS}},
    "http_bodies": [],
    "url_query_params": {"mode": "denylist", "terms": _PII_TERMS},
    "graphql": {"document": False, "variables": False},
    "gen_ai": {"inputs": False, "outputs": False},
    "database_query_data": False,
    "queues": False,
    "stack_frame_variables": {"mode": "denylist"},
    "frame_context_lines": 5,
}

# Passing ``data_collection`` switches off the SDK's built-in EventScrubber, so
# it is re-applied here: extra, breadcrumbs, spans and frame variables keep the
# same denylist scrubbing as before.
_SCRUBBER = EventScrubber(send_default_pii=False)


def scrub_event(event: dict[str, Any], hint: dict[str, Any]) -> dict[str, Any]:
    """``before_send_transaction``: the SDK's default denylist scrubbing."""
    _SCRUBBER.scrub_event(event)
    return event


def before_send(event: dict[str, Any], hint: dict[str, Any]) -> dict[str, Any] | None:
    """``before_send``: scrub, then drop the benign noise."""
    return drop_benign_noise(scrub_event(event, hint), hint)
