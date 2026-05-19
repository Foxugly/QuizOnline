"""
Two-channel notification delivery layer.

Each canonical *kind* below can be delivered via two independent
channels — ``email`` (queued through the mailer) and ``web`` (in-app
``Notification`` row). Whether a given channel fires for a given
``(recipient, kind)`` is the **intersection** of two opt-outs:

* the **domain owner** can mute a channel for the whole domain via
  ``Domain.notification_settings``;
* the **recipient user** can mute a channel for themselves via
  ``CustomUser.notification_prefs``.

Both maps are sparse: a missing key (or a missing channel inside a
key) means "on by default", so a fresh user/domain receives everything.
Users / owners opt out by writing ``False`` against a channel.

Security-critical mails (registration confirmation, password reset,
magic-link sign-in) are NEVER routed through this layer — they always
send via the mailer directly, regardless of any preference.

Adding a new kind:
1. add a ``KIND_*`` constant + entry in :data:`NOTIFICATION_KINDS`,
2. tag it with a recipient role in :data:`KIND_ROLE` so the frontend
   knows how to group it (``"user"``, ``"manager"``, ``"owner"``),
3. emit it from the relevant view/service through :func:`notify`.
"""

from __future__ import annotations

from typing import Callable, Iterable

# Canonical kinds. Frontend uses the same string values — do NOT rename
# without coordinating the i18n keys + the existing notification rows.
KIND_JOIN_REQUEST_CREATED = "domain.join_request.created"
KIND_JOIN_REQUEST_DECIDED = "domain.join_request.decided"
KIND_JOIN_REQUEST_EXPIRY = "domain.join_request.expiry_warning"
KIND_INVITE_RECEIVED = "domain.invite.received"
KIND_TRANSFER_RECEIVED = "domain.transfer.received"
KIND_QUIZ_ASSIGNMENT = "quiz.assignment"
KIND_QUIZ_COMPLETED = "quiz.completed"
KIND_QUIZ_RESULT_AVAILABLE = "quiz.result_available"
KIND_QUIZ_DETAIL_AVAILABLE = "quiz.detail_available"
# LMS course-invite events. The ``sent`` and ``accepted`` kinds target
# the inviter (an instructor) — they confirm to the manager-side that
# their action went through. ``received`` targets the invitee (a
# domain member / learner) so they can act on the invitation.
KIND_COURSE_INVITE_SENT = "lms.course_invite.sent"
KIND_COURSE_INVITE_RECEIVED = "lms.course_invite.received"
KIND_COURSE_INVITE_ACCEPTED = "lms.course_invite.accepted"
# Pending self-enrollment on an ``approval``-mode course. Fanned out
# to every instructor (domain owner + managers) so they know there is
# a row to approve / reject in the course's Inscriptions tab.
KIND_COURSE_ENROLLMENT_REQUEST = "lms.course_enrollment_request.created"

NOTIFICATION_KINDS: tuple[str, ...] = (
    KIND_JOIN_REQUEST_CREATED,
    KIND_JOIN_REQUEST_DECIDED,
    KIND_JOIN_REQUEST_EXPIRY,
    KIND_INVITE_RECEIVED,
    KIND_TRANSFER_RECEIVED,
    KIND_QUIZ_ASSIGNMENT,
    KIND_QUIZ_COMPLETED,
    KIND_QUIZ_RESULT_AVAILABLE,
    KIND_QUIZ_DETAIL_AVAILABLE,
    KIND_COURSE_INVITE_SENT,
    KIND_COURSE_INVITE_RECEIVED,
    KIND_COURSE_INVITE_ACCEPTED,
    KIND_COURSE_ENROLLMENT_REQUEST,
)

# Role of the *recipient* — drives the way prefs are grouped in the UI
# and the role the user must hold (anywhere) to even see the toggle.
ROLE_USER = "user"
ROLE_MANAGER = "manager"
ROLE_OWNER = "owner"
ROLES: tuple[str, ...] = (ROLE_USER, ROLE_MANAGER, ROLE_OWNER)

KIND_ROLE: dict[str, str] = {
    KIND_JOIN_REQUEST_CREATED: ROLE_MANAGER,
    KIND_JOIN_REQUEST_DECIDED: ROLE_USER,
    KIND_JOIN_REQUEST_EXPIRY: ROLE_USER,
    KIND_INVITE_RECEIVED: ROLE_USER,
    KIND_TRANSFER_RECEIVED: ROLE_OWNER,
    KIND_QUIZ_ASSIGNMENT: ROLE_USER,
    KIND_QUIZ_COMPLETED: ROLE_OWNER,
    KIND_QUIZ_RESULT_AVAILABLE: ROLE_USER,
    KIND_QUIZ_DETAIL_AVAILABLE: ROLE_USER,
    KIND_COURSE_INVITE_SENT: ROLE_MANAGER,
    KIND_COURSE_INVITE_RECEIVED: ROLE_USER,
    KIND_COURSE_INVITE_ACCEPTED: ROLE_MANAGER,
    KIND_COURSE_ENROLLMENT_REQUEST: ROLE_MANAGER,
}

CHANNEL_EMAIL = "email"
CHANNEL_WEB = "web"
CHANNELS: tuple[str, ...] = (CHANNEL_EMAIL, CHANNEL_WEB)


# ---------------------------------------------------------------------
# Pref normalization (user) + settings normalization (domain)
# ---------------------------------------------------------------------

def _coerce_channel_map(value) -> dict[str, bool]:
    """
    Accept either the legacy boolean ``False`` (= "mute email") or the
    new ``{email, web}`` dict and return a minimal sparse dict that
    only stores explicit ``False`` values. ``True`` / missing always
    mean "on".
    """
    # Legacy shape: a single bool gated only the email channel.
    if value is False:
        return {CHANNEL_EMAIL: False}
    if value is True or value is None:
        return {}
    if not isinstance(value, dict):
        return {}
    out: dict[str, bool] = {}
    for channel in CHANNELS:
        raw = value.get(channel)
        if raw is False:
            out[channel] = False
    return out


def normalize_prefs(raw) -> dict:
    """
    Normalize ``CustomUser.notification_prefs`` to ``{kind: {channel: False, ...}}``
    keeping only explicit opt-outs (``True`` / missing == enabled).
    Tolerates the legacy ``{kind: false}`` boolean shape so existing
    rows stay backward-compatible while a data migration walks them.
    """
    if not isinstance(raw, dict):
        return {}
    out: dict[str, dict[str, bool]] = {}
    for kind in NOTIFICATION_KINDS:
        channel_map = _coerce_channel_map(raw.get(kind))
        if channel_map:
            out[kind] = channel_map
    return out


def normalize_domain_settings(raw) -> dict:
    """
    Domain-level settings are one boolean per kind: "do we communicate
    on this event at all?". ``False`` mutes the whole event for the
    domain (no email, no web, no anything). ``True`` (or missing) lets
    the user-level prefs decide which channels to deliver on.

    A previous in-flight design experimented with a per-channel dict
    here; this function still tolerates that shape so any stale row
    folds gracefully — an event was "off" iff *both* channels had
    been explicitly set to False (otherwise the user was meant to
    receive something through *some* channel).
    """
    if not isinstance(raw, dict):
        return {}
    out: dict[str, bool] = {}
    for kind in NOTIFICATION_KINDS:
        value = raw.get(kind)
        if value is False:
            out[kind] = False
        elif isinstance(value, dict):
            email_off = value.get(CHANNEL_EMAIL) is False
            web_off = value.get(CHANNEL_WEB) is False
            if email_off and web_off:
                out[kind] = False
        # True / missing == on (kind emitted by the domain).
    return out


def domain_emits(domain, kind: str) -> bool:
    """
    True iff ``domain`` allows ``kind`` to be communicated at all.
    Missing domain or missing key == True (on by default).
    """
    if domain is None:
        return True
    settings_blob = getattr(domain, "notification_settings", None) or {}
    value = settings_blob.get(kind)
    if value is False:
        return False
    # Legacy per-channel blob: treat "all channels off" as "kind off".
    if isinstance(value, dict):
        email_off = value.get(CHANNEL_EMAIL) is False
        web_off = value.get(CHANNEL_WEB) is False
        if email_off and web_off:
            return False
    return True


# ---------------------------------------------------------------------
# Effective resolution (intersection)
# ---------------------------------------------------------------------

def _channel_enabled_for_user(user, kind: str, channel: str) -> bool:
    if user is None:
        return True
    prefs = getattr(user, "notification_prefs", None) or {}
    return _coerce_channel_map(prefs.get(kind)).get(channel, True)


def channel_enabled(*, user, kind: str, channel: str, domain=None) -> bool:
    """
    True iff the kind is allowed to flow via ``channel`` for this
    ``(domain, user)`` pair.

    Resolution: the domain decides *whether the event is communicated
    at all* (one bool per kind); if it says "off", no channel fires.
    If it says "on", the user picks which channels they receive on
    via their per-channel prefs. This split avoids the empty-intersection
    silence trap where domain and user want different channels.
    """
    if not domain_emits(domain, kind):
        return False
    return _channel_enabled_for_user(user, kind, channel)


def notification_enabled(user, kind: str) -> bool:
    """
    Legacy helper kept for back-compat with call sites that still ask
    "does the user want any notification for this kind?". Now resolves
    to "email channel enabled at the user level only" so the existing
    mailer guard keeps its historical semantics (the domain side is
    handled separately at the new ``notify`` call site).
    """
    if user is None or not getattr(user, "is_authenticated", True):
        return True
    return _channel_enabled_for_user(user, kind, CHANNEL_EMAIL)


# ---------------------------------------------------------------------
# Web emission
# ---------------------------------------------------------------------

def emit_notification(*, user, kind: str, payload: dict | None = None):
    """
    Create one in-app ``Notification`` row for ``user`` and return it.

    No-op (returns ``None``) when ``user`` is anonymous or has no id
    yet — invite flows hit this path because the invitee may not have
    a CustomUser row at the time we try to notify.

    Channel resolution is **not** done here on purpose: the helper is
    used by the orchestrator :func:`notify` which already knows whether
    the web channel is allowed. Callers that bypass :func:`notify` and
    call ``emit_notification`` directly are choosing to ignore the
    pref system on purpose (e.g. test fixtures).
    """
    if user is None or not getattr(user, "id", None):
        return None
    from customuser.models import Notification

    return Notification.objects.create(
        user=user,
        kind=kind[: Notification.KIND_MAX_LENGTH] if kind else "",
        payload=payload or {},
    )


# ---------------------------------------------------------------------
# High-level orchestrator
# ---------------------------------------------------------------------

def notify(
    *,
    user,
    kind: str,
    payload: dict | None = None,
    domain=None,
    email_callable: Callable[[], None] | None = None,
) -> dict[str, bool]:
    """
    Deliver ``kind`` to ``user`` honouring the 2-channel (email × web)
    intersection of domain and user preferences.

    ``payload`` is stored on the web row (and is what the frontend
    uses to render the human-readable line). ``email_callable`` is a
    zero-arg callable that queues / sends the actual mail; it is
    invoked iff the email channel resolves to enabled.

    Returns ``{"web": bool, "email": bool}`` describing what was
    actually fired, mostly for tests / logs.
    """
    result = {CHANNEL_WEB: False, CHANNEL_EMAIL: False}
    if user is None:
        return result

    if channel_enabled(user=user, kind=kind, channel=CHANNEL_WEB, domain=domain):
        if emit_notification(user=user, kind=kind, payload=payload):
            result[CHANNEL_WEB] = True

    if (
        email_callable is not None
        and getattr(user, "email", "")
        and channel_enabled(user=user, kind=kind, channel=CHANNEL_EMAIL, domain=domain)
    ):
        email_callable()
        result[CHANNEL_EMAIL] = True

    return result


def notify_many(
    *,
    users: Iterable,
    kind: str,
    payload_builder: Callable[[object], dict] | dict | None = None,
    domain=None,
    email_callable_builder: Callable[[object], Callable[[], None] | None] | None = None,
) -> list[dict[str, bool]]:
    """
    Loop helper for fan-out emissions (e.g. join-request created → all
    domain managers). ``payload_builder`` may be a static dict (shared
    by all recipients) or a callable that takes the recipient. Same
    for ``email_callable_builder``: ``None`` means no mail for that
    recipient.
    """
    out: list[dict[str, bool]] = []
    for user in users:
        if callable(payload_builder):
            payload = payload_builder(user) or {}
        else:
            payload = dict(payload_builder or {})
        email_callable = (
            email_callable_builder(user) if email_callable_builder else None
        )
        out.append(
            notify(
                user=user,
                kind=kind,
                payload=payload,
                domain=domain,
                email_callable=email_callable,
            )
        )
    return out
