"""
Signed, time-limited tokens for moderating a domain join request from an
email link.

Thin wrapper over :mod:`domain.signed_token` that binds the salt and
the TTL and validates the payload shape: ``{rid, uid, act}`` where
``act`` is ``approve`` or ``reject``. The action being baked into the
token is the security contract — a recipient cannot switch the verb
after the fact.
"""

from domain.signed_token import (
    TokenError as _TokenError,
    TokenExpired as _TokenExpired,
    TokenInvalid as _TokenInvalid,
    make_token,
    parse_token,
)

DECISION_TOKEN_TTL_SECONDS = 7 * 24 * 3600  # 7 days
SALT = "domain.join.decide"
ALLOWED_ACTIONS = ("approve", "reject")


# Re-export the generic exceptions under the names existing callers and
# tests already know.
class DecisionTokenError(_TokenError):
    pass


class DecisionTokenExpired(_TokenExpired, DecisionTokenError):
    pass


class DecisionTokenInvalid(_TokenInvalid, DecisionTokenError):
    pass


def make_decision_token(*, request_id: int, recipient_user_id: int, action: str) -> str:
    if action not in ALLOWED_ACTIONS:
        raise ValueError(f"invalid action: {action!r}")
    return make_token(
        salt=SALT,
        payload={"rid": int(request_id), "uid": int(recipient_user_id), "act": action},
    )


def _validate_decision_payload(data) -> dict:
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


def parse_decision_token(token: str) -> dict:
    try:
        return parse_token(
            salt=SALT,
            token=token,
            ttl_seconds=DECISION_TOKEN_TTL_SECONDS,
            validate=_validate_decision_payload,
        )
    except _TokenExpired as exc:
        raise DecisionTokenExpired() from exc
    except _TokenInvalid as exc:
        raise DecisionTokenInvalid() from exc
