"""
Signed, time-limited tokens for inviting an external email address to
join a domain.

Thin wrapper over :mod:`domain.signed_token` that binds the salt and
the TTL and validates the payload shape: ``{did, email, iid}``. The
domain and the recipient are baked in so that a leaked or forwarded
link cannot be reused against a different domain or by a different
account.
"""

from domain.signed_token import (
    TokenError as _TokenError,
    TokenExpired as _TokenExpired,
    TokenInvalid as _TokenInvalid,
    make_token,
    parse_token,
)

INVITE_TOKEN_TTL_SECONDS = 7 * 24 * 3600  # 7 days
SALT = "domain.invite"


class InviteTokenError(_TokenError):
    pass


class InviteTokenExpired(_TokenExpired, InviteTokenError):
    pass


class InviteTokenInvalid(_TokenInvalid, InviteTokenError):
    pass


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def make_invite_token(*, domain_id: int, email: str, inviter_id: int) -> str:
    return make_token(
        salt=SALT,
        payload={
            "did": int(domain_id),
            "email": _normalize_email(email),
            "iid": int(inviter_id),
        },
    )


def _validate_invite_payload(data) -> dict:
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


def parse_invite_token(token: str) -> dict:
    try:
        return parse_token(
            salt=SALT,
            token=token,
            ttl_seconds=INVITE_TOKEN_TTL_SECONDS,
            validate=_validate_invite_payload,
        )
    except _TokenExpired as exc:
        raise InviteTokenExpired() from exc
    except _TokenInvalid as exc:
        raise InviteTokenInvalid() from exc
