"""
Generic signed-token primitive shared by ``decision_token`` and
``invite_token``.

Both modules used to ship the same skeleton (TimestampSigner-style
encode/decode, two custom exceptions, JSON shape validation) with only
the salt and the payload-shape validation differing. This module
centralises the cryptographic / lifecycle plumbing so future signed
tokens (transfer-ownership, magic-link, …) inherit the exact same
URL-safe encoding, salt scoping and TTL semantics.

Usage
-----

    from domain.signed_token import make_token, parse_token, TokenError

    def make_invite(domain_id, email, inviter_id):
        return make_token(
            salt="domain.invite",
            payload={"did": int(domain_id), "email": email, "iid": int(inviter_id)},
        )

    def parse_invite(token):
        return parse_token(
            salt="domain.invite",
            token=token,
            ttl_seconds=7 * 24 * 3600,
            validate=_validate_invite_shape,  # raises TokenInvalid on bad shape
        )

The two thin modules (``decision_token``, ``invite_token``) still exist
as named wrappers — they bind the salt, the TTL, and the payload-shape
checker so callers do not need to remember the parameters.
"""

from typing import Any, Callable, TypeVar

from django.core import signing

T = TypeVar("T")


class TokenError(Exception):
    """Base class for any signed-token decoding failure."""


class TokenExpired(TokenError):
    """Signature still verifies but the TTL has elapsed."""


class TokenInvalid(TokenError):
    """Bad signature, malformed payload, or failed shape validation."""


def make_token(*, salt: str, payload: dict) -> str:
    """URL-safe signed token over ``payload``, scoped to ``salt``."""
    return signing.dumps(payload, salt=salt)


def parse_token(
    *,
    salt: str,
    token: str,
    ttl_seconds: int,
    validate: Callable[[Any], T],
) -> T:
    """
    Decode ``token`` under ``salt`` with the given TTL and pass the
    payload to ``validate``. ``validate`` is the per-token shape check;
    it returns the canonicalised payload (typed dict, dataclass, …) or
    raises :class:`TokenInvalid`. We funnel signing errors through our
    own exception hierarchy so callers never need to import Django's
    signing exceptions.
    """
    try:
        data = signing.loads(token, salt=salt, max_age=ttl_seconds)
    except signing.SignatureExpired as exc:
        raise TokenExpired() from exc
    except signing.BadSignature as exc:
        raise TokenInvalid() from exc
    return validate(data)
