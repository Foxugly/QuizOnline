"""
Tiny indirection layer between mailers and the per-user
``notification_prefs`` JSON map on :class:`customuser.CustomUser`.

The map is sparse on purpose: a missing key means the kind is *on*
for that user, so a fresh account (with ``notification_prefs == {}``)
receives every notification by default. Users opt out by writing
``False`` against a specific key from the canonical list below.

Security-critical mails (registration confirmation, password reset,
magic-link sign-in) are NEVER routed through this helper; they always
send. Add a new constant to ``NOTIFICATION_KINDS`` when you add a new
optional mailer.
"""

from __future__ import annotations

# Canonical opt-outable notification kinds. Frontend uses the same
# string values, so do not rename without coordinating the i18n keys.
KIND_JOIN_REQUEST_CREATED = "domain.join_request.created"
KIND_JOIN_REQUEST_DECIDED = "domain.join_request.decided"
KIND_JOIN_REQUEST_EXPIRY = "domain.join_request.expiry_warning"
KIND_INVITE_RECEIVED = "domain.invite.received"
KIND_TRANSFER_RECEIVED = "domain.transfer.received"

NOTIFICATION_KINDS = (
    KIND_JOIN_REQUEST_CREATED,
    KIND_JOIN_REQUEST_DECIDED,
    KIND_JOIN_REQUEST_EXPIRY,
    KIND_INVITE_RECEIVED,
    KIND_TRANSFER_RECEIVED,
)


def notification_enabled(user, kind: str) -> bool:
    """
    Whether ``user`` wants to receive the notification ``kind``. Returns
    ``True`` by default (sparse map, missing key = enabled) and only
    ``False`` when the user has explicitly opted out.

    Anonymous ``user`` (e.g. invite to an address that has no account
    yet) is always allowed because we have no preference to read from.
    """
    if user is None or not getattr(user, "is_authenticated", True):
        return True
    prefs = getattr(user, "notification_prefs", None) or {}
    return bool(prefs.get(kind, True))


def emit_notification(*, user, kind: str, payload: dict | None = None):
    """
    Create one in-app ``Notification`` row for ``user`` and return it.

    The web channel is **always emitted** regardless of
    ``notification_prefs``: those preferences only gate email delivery
    (the absence of an in-app trace would defeat the whole point of a
    notifications inbox the user can review later).

    No-op (returns ``None``) when ``user`` is anonymous or has no id
    yet — invite flows hit this path because the invitee may not have
    a CustomUser row at the time we try to notify.

    Defensive on the model side: any unknown ``kind`` is accepted (the
    canonical list lives in :data:`NOTIFICATION_KINDS`; new kinds must
    be added there to be opt-out-able via prefs).
    """
    if user is None or not getattr(user, "id", None):
        return None
    # Avoid an import cycle: notifications.py is imported by mailers,
    # which themselves are imported at app-load time on some paths.
    from customuser.models import Notification

    return Notification.objects.create(
        user=user,
        kind=kind[: Notification.KIND_MAX_LENGTH] if kind else "",
        payload=payload or {},
    )


def normalize_prefs(raw) -> dict:
    """
    Coerce a user-provided payload into the canonical sparse-map shape:
    only known kinds, only ``bool`` values, ``True`` defaults stripped
    out so the stored dict stays minimal.
    """
    if not isinstance(raw, dict):
        return {}
    out: dict[str, bool] = {}
    for kind in NOTIFICATION_KINDS:
        value = raw.get(kind)
        if value is False:
            out[kind] = False
        # ``True`` and missing key both mean enabled — never persist
        # the ``True`` to keep the row sparse.
    return out
