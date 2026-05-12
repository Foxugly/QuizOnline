"""
Signed, time-limited tokens for the domain-ownership-transfer flow.

Same pattern as :mod:`decision_token` and :mod:`invite_token`:
URL-safe ``signing.dumps`` over a 3-field payload, scoped to a unique
salt, bound to a recipient and an action. Reusing one infrastructure
for every signed-link feature in this app keeps the cryptographic
hygiene (URL-safe, salt-scoped, TTL-bounded) consistent.

Payload shape: ``{did, fid, tid}`` — domain id, future-owner user id,
transfer initiator user id. The future owner is baked in so the link
cannot be hijacked to grant ownership to a different account; the
initiator is recorded so the accept page can show "transferred to you
by X".
"""

from domain.signed_token import (
    TokenError as _TokenError,
    TokenExpired as _TokenExpired,
    TokenInvalid as _TokenInvalid,
    make_token,
    parse_token,
)

TRANSFER_TOKEN_TTL_SECONDS = 7 * 24 * 3600  # 7 days
SALT = "domain.transfer"


class TransferTokenError(_TokenError):
    pass


class TransferTokenExpired(_TokenExpired, TransferTokenError):
    pass


class TransferTokenInvalid(_TokenInvalid, TransferTokenError):
    pass


def make_transfer_token(*, domain_id: int, future_owner_id: int, initiator_id: int) -> str:
    return make_token(
        salt=SALT,
        payload={
            "did": int(domain_id),
            "fid": int(future_owner_id),
            "tid": int(initiator_id),
        },
    )


def _validate_transfer_payload(data) -> dict:
    if not isinstance(data, dict):
        raise TransferTokenInvalid()
    did = data.get("did")
    fid = data.get("fid")
    tid = data.get("tid")
    if not (isinstance(did, int) and isinstance(fid, int) and isinstance(tid, int)):
        raise TransferTokenInvalid()
    return {"domain_id": did, "future_owner_id": fid, "initiator_id": tid}


def parse_transfer_token(token: str) -> dict:
    try:
        return parse_token(
            salt=SALT,
            token=token,
            ttl_seconds=TRANSFER_TOKEN_TTL_SECONDS,
            validate=_validate_transfer_payload,
        )
    except _TokenExpired as exc:
        raise TransferTokenExpired() from exc
    except _TokenInvalid as exc:
        raise TransferTokenInvalid() from exc
