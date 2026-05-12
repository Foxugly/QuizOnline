"""
Signed, time-limited tokens for inviting an external email address to
join a domain.

Like :mod:`domain.decision_token`, this uses Django's URL-safe
:func:`django.core.signing.dumps`. The payload encodes:

- ``did`` (domain id) — locks the invitation to one domain;
- ``email`` (normalised lowercase) — locks the invitation to one
  recipient; an attacker who intercepts the link cannot accept it under
  a different account;
- ``iid`` (inviter id) — recorded so the accept page can show "you were
  invited by X".

The salt is scoped to ``domain.invite`` so an invitation token cannot
be replayed against the decision endpoint (or vice versa), even though
both use the same SECRET_KEY.
"""

from django.core import signing

INVITE_TOKEN_TTL_SECONDS = 7 * 24 * 3600  # 7 days
SALT = "domain.invite"


class InviteTokenError(Exception):
    """Base class for decoding failures."""


class InviteTokenExpired(InviteTokenError):
    """The signature is valid but the TTL has elapsed."""


class InviteTokenInvalid(InviteTokenError):
    """The token is malformed or the signature does not verify."""


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def make_invite_token(*, domain_id: int, email: str, inviter_id: int) -> str:
    return signing.dumps(
        {
            "did": int(domain_id),
            "email": _normalize_email(email),
            "iid": int(inviter_id),
        },
        salt=SALT,
    )


def parse_invite_token(token: str) -> dict:
    try:
        data = signing.loads(token, salt=SALT, max_age=INVITE_TOKEN_TTL_SECONDS)
    except signing.SignatureExpired as exc:
        raise InviteTokenExpired() from exc
    except signing.BadSignature as exc:
        raise InviteTokenInvalid() from exc

    if not isinstance(data, dict):
        raise InviteTokenInvalid()
    did = data.get("did")
    email = data.get("email")
    iid = data.get("iid")
    if (
        not isinstance(did, int)
        or not isinstance(email, str)
        or not email
        or not isinstance(iid, int)
    ):
        raise InviteTokenInvalid()
    return {"domain_id": did, "email": _normalize_email(email), "inviter_id": iid}
