"""
Helpers shared by the three public token-landing APIViews
(``DomainJoinRequestDecideView``, ``DomainInviteAcceptView``,
``DomainTransferAcceptView``).

These views all do the same first step — verify a signed, time-limited
token coming from an email link — and the same second-step fallback for
the localized domain name they echo back to the SPA. Centralising the
two helpers keeps the views focused on the action-specific logic
(authorize, execute, render state) instead of repeating boilerplate.
"""

from typing import Callable, Optional, Tuple

from rest_framework import status
from rest_framework.response import Response

from .signed_token import TokenExpired, TokenInvalid


def consume_signed_token(
    token: str,
    parser: Callable[[str], dict],
) -> Tuple[Optional[dict], Optional[Response]]:
    """
    Run ``parser(token)`` and normalise the outcome to ``(payload, error)``.

    Every per-feature parser (``parse_decision_token`` / ``parse_invite_token``
    / ``parse_transfer_token``) raises a ``TokenExpired`` or ``TokenInvalid``
    subclass on failure, so we catch the base classes from
    :mod:`domain.signed_token` and return a ready-to-serve 410/400 response.
    Callers check ``if error is not None`` and short-circuit.
    """
    try:
        return parser(token), None
    except TokenExpired:
        return None, Response({"detail": "token_expired"}, status=status.HTTP_410_GONE)
    except TokenInvalid:
        return None, Response({"detail": "token_invalid"}, status=status.HTTP_400_BAD_REQUEST)


def safe_domain_name(domain) -> str:
    """
    Localized domain name with a stable ``Domain#<pk>`` fallback so the
    invite / transfer landing pages always have *something* to render even
    when no translation exists for the visitor's language.
    """
    return domain.safe_translation_getter("name", any_language=True) or f"Domain#{domain.pk}"
