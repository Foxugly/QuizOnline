"""
Signed, short-lived tokens for passwordless email login.

Same plumbing as the domain signed-token family
(:mod:`domain.signed_token`), but salted to a distinct
``auth.magic_link`` namespace and with a much tighter TTL (15 minutes)
because the token grants direct authentication on click.

Payload: ``{uid, s}`` — the user primary key and a fingerprint of the
account state (password hash, ``last_login``, e-mail). The exchange
recomputes the fingerprint and bumps ``last_login`` under a row lock, so a
link is single-use and dies with any password change or later login.
"""

from django.utils.crypto import constant_time_compare, salted_hmac

from domain.signed_token import (
    TokenError as _TokenError,
)
from domain.signed_token import (
    TokenExpired as _TokenExpired,
)
from domain.signed_token import (
    TokenInvalid as _TokenInvalid,
)
from domain.signed_token import (
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


def account_state_fingerprint(user) -> str:
    # Microsecond precision: a login in the same second must still change it.
    last_login = int(user.last_login.timestamp() * 1_000_000) if user.last_login else ""
    return salted_hmac(
        f"{SALT}.state",
        f"{user.pk}|{user.password}|{last_login}|{user.email or ''}",
        algorithm="sha256",
    ).hexdigest()[:32]


def fingerprint_matches(user, fingerprint: str) -> bool:
    return constant_time_compare(account_state_fingerprint(user), fingerprint)


def make_magic_link_token(user) -> str:
    return make_token(
        salt=SALT,
        payload={"uid": int(user.pk), "s": account_state_fingerprint(user)},
    )


def _validate_magic_link_payload(data) -> dict:
    if not isinstance(data, dict):
        raise MagicLinkTokenInvalid()
    uid = data.get("uid")
    state = data.get("s")
    if not isinstance(uid, int) or not isinstance(state, str):
        raise MagicLinkTokenInvalid()
    return {"user_id": uid, "state": state}


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
