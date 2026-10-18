"""
Signed, time-limited tokens for the domain-ownership-transfer flow.

Same pattern as :mod:`decision_token` and :mod:`invite_token`:
URL-safe ``signing.dumps`` over a 3-field payload, scoped to a unique
salt, bound to a recipient and an action. Reusing one infrastructure
for every signed-link feature in this app keeps the cryptographic
hygiene (URL-safe, salt-scoped, TTL-bounded) consistent.

Payload shape: ``{did, fid, tid, n}`` — domain id, future-owner user id,
transfer initiator user id, and a random nonce. The nonce is also stored
on the ``transfer.initiate`` audit row; a token is live only while that
row is the domain's latest transfer event (see
:func:`transfer_is_current`), which makes the link single-use,
superseded by a newer transfer and revocable. The future owner is baked in so the link
cannot be hijacked to grant ownership to a different account; the
initiator is recorded so the accept page can show "transferred to you
by X".
"""

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

TRANSFER_TOKEN_TTL_SECONDS = 7 * 24 * 3600  # 7 days
SALT = "domain.transfer"


class TransferTokenError(_TokenError):
    pass


class TransferTokenExpired(_TokenExpired, TransferTokenError):
    pass


class TransferTokenInvalid(_TokenInvalid, TransferTokenError):
    pass


TRANSFER_EVENT_ACTIONS = ("transfer.initiate", "transfer.accept", "transfer.revoke")


def make_transfer_token(
    *, domain_id: int, future_owner_id: int, initiator_id: int, nonce: str,
) -> str:
    return make_token(
        salt=SALT,
        payload={
            "did": int(domain_id),
            "fid": int(future_owner_id),
            "tid": int(initiator_id),
            "n": str(nonce),
        },
    )


def latest_transfer_event(domain):
    """The domain's most recent transfer audit row (initiate / accept /
    revoke), or ``None``."""
    from domain.models import DomainAuditLog

    return (
        DomainAuditLog.objects
        .filter(domain=domain, action__in=TRANSFER_EVENT_ACTIONS)
        .order_by("-created_at", "-id")
        .first()
    )


def transfer_is_current(domain, nonce: str) -> bool:
    """True iff the token's nonce belongs to the latest transfer event and
    that event is an initiation (not yet accepted, revoked or superseded)."""
    event = latest_transfer_event(domain)
    return bool(
        event is not None
        and event.action == "transfer.initiate"
        and nonce
        and (event.metadata or {}).get("nonce") == nonce
    )


def _validate_transfer_payload(data) -> dict:
    if not isinstance(data, dict):
        raise TransferTokenInvalid()
    did = data.get("did")
    fid = data.get("fid")
    tid = data.get("tid")
    nonce = data.get("n")
    if not (isinstance(did, int) and isinstance(fid, int) and isinstance(tid, int)):
        raise TransferTokenInvalid()
    if not (isinstance(nonce, str) and nonce):
        raise TransferTokenInvalid()
    return {"domain_id": did, "future_owner_id": fid, "initiator_id": tid, "nonce": nonce}


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
