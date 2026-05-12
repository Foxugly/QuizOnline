"""
Signed, time-limited tokens for moderating a domain join request from an
email link.

The token is built with :func:`django.core.signing.dumps`, which packs
the payload as compressed URL-safe base64 + timestamp + signature signed
with ``settings.SECRET_KEY``. URL-safe encoding matters: this token is
embedded raw in a URL path segment, so we cannot afford characters that
would need percent-encoding (``{``, ``}``, ``"``, etc.).

The signature is intentionally narrow:

* the action (``approve`` / ``reject``) is baked into the token, so a
  recipient cannot switch the verb after the fact;
* the recipient user id is baked in too, so a leaked token cannot be
  reused by a different moderator;
* a 7-day TTL bounds the blast radius of leaked or forwarded mail;
* the salt scopes the signature to this domain (``domain.join.decide``)
  so tokens cannot be replayed against other signing surfaces that may
  later reuse the same SECRET_KEY.
"""

from django.core import signing

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
    return signing.dumps(
        {"rid": int(request_id), "uid": int(recipient_user_id), "act": action},
        salt=SALT,
    )


def parse_decision_token(token: str) -> dict:
    try:
        data = signing.loads(token, salt=SALT, max_age=DECISION_TOKEN_TTL_SECONDS)
    except signing.SignatureExpired as exc:
        raise DecisionTokenExpired() from exc
    except signing.BadSignature as exc:
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
