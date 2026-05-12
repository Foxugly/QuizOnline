"""
Signed, time-limited tokens for moderating a domain join request from an
email link.

The token is built with :class:`django.core.signing.TimestampSigner`
(HMAC over the request payload + the current epoch second, signed with
``settings.SECRET_KEY``). It is intentionally narrow:

* the action (``approve`` / ``reject``) is baked into the token, so a
  recipient cannot switch the verb after the fact;
* the recipient user id is baked in too, so a leaked token cannot be
  reused by a different moderator;
* a 7-day TTL bounds the blast radius of leaked or forwarded mail;
* the salt scopes the signature to this domain (``domain.join.decide``)
  so tokens cannot be replayed against other signing surfaces that may
  later reuse ``TimestampSigner``.
"""

import json

from django.core.signing import BadSignature, SignatureExpired, TimestampSigner

DECISION_TOKEN_TTL_SECONDS = 7 * 24 * 3600  # 7 days
SALT = "domain.join.decide"
ALLOWED_ACTIONS = ("approve", "reject")


class DecisionTokenError(Exception):
    """Base class for decoding failures."""


class DecisionTokenExpired(DecisionTokenError):
    """The token signature is valid but the TTL has elapsed."""


class DecisionTokenInvalid(DecisionTokenError):
    """The token is malformed or the signature does not verify."""


def make_decision_token(*, request_id: int, recipient_user_id: int, action: str) -> str:
    if action not in ALLOWED_ACTIONS:
        raise ValueError(f"invalid action: {action!r}")
    payload = json.dumps(
        {"rid": int(request_id), "uid": int(recipient_user_id), "act": action},
        separators=(",", ":"),
    )
    signer = TimestampSigner(salt=SALT)
    return signer.sign(payload)


def parse_decision_token(token: str) -> dict:
    signer = TimestampSigner(salt=SALT)
    try:
        payload = signer.unsign(token, max_age=DECISION_TOKEN_TTL_SECONDS)
    except SignatureExpired as exc:
        raise DecisionTokenExpired() from exc
    except BadSignature as exc:
        raise DecisionTokenInvalid() from exc

    try:
        data = json.loads(payload)
    except (ValueError, TypeError) as exc:
        raise DecisionTokenInvalid() from exc

    if not isinstance(data, dict):
        raise DecisionTokenInvalid()
    rid = data.get("rid")
    uid = data.get("uid")
    act = data.get("act")
    if (
        not isinstance(rid, int)
        or not isinstance(uid, int)
        or act not in ALLOWED_ACTIONS
    ):
        raise DecisionTokenInvalid()
    return {"request_id": rid, "recipient_user_id": uid, "action": act}
