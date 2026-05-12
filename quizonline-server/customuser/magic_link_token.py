"""
Signed, short-lived tokens for passwordless email login.

Same plumbing as the domain signed-token family
(:mod:`domain.signed_token`), but salted to a distinct
``auth.magic_link`` namespace and with a much tighter TTL (15 minutes)
because the token grants direct authentication on click.

Payload: ``{uid}`` — just the user primary key. The user's identity is
authoritative on the server side; we never trust client-side hints.
"""

from domain.signed_token import (
    TokenError as _TokenError,
    TokenExpired as _TokenExpired,
    TokenInvalid as _TokenInvalid,
    make_token,
    parse_token,
)

MAGIC_LINK_TOKEN_TTL_SECONDS = 15 * 60  # 15 minutes
SALT = "auth.magic_link"


class MagicLinkTokenError(_TokenError):
    pass


class MagicLinkTokenExpired(_TokenExpired, MagicLinkTokenError):
    pass


class MagicLinkTokenInvalid(_TokenInvalid, MagicLinkTokenError):
    pass


def make_magic_link_token(*, user_id: int) -> str:
    return make_token(salt=SALT, payload={"uid": int(user_id)})


def _validate_magic_link_payload(data) -> dict:
    if not isinstance(data, dict):
        raise MagicLinkTokenInvalid()
    uid = data.get("uid")
    if not isinstance(uid, int):
        raise MagicLinkTokenInvalid()
    return {"user_id": uid}


def parse_magic_link_token(token: str) -> dict:
    try:
        return parse_token(
            salt=SALT,
            token=token,
            ttl_seconds=MAGIC_LINK_TOKEN_TTL_SECONDS,
            validate=_validate_magic_link_payload,
        )
    except _TokenExpired as exc:
        raise MagicLinkTokenExpired() from exc
    except _TokenInvalid as exc:
        raise MagicLinkTokenInvalid() from exc
