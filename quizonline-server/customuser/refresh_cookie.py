"""HttpOnly refresh-token cookie for the web SPA (opt-in, fleet design).

Piloted on PushIT (PushIT_server #69, ``accounts/refresh_cookie.py``). The SPA
opts in by sending ``X-Auth-Mode: cookie`` on its auth calls. For those
requests the refresh token travels in an ``HttpOnly; Secure; SameSite=Lax``
cookie scoped to ``/api/v1/token/`` (refresh + logout), and is **omitted from
the JSON body**: JavaScript never sees it, so an XSS can no longer exfiltrate
it. Requests without the header (API scripts, old SPA bundles) keep the
historical body-token contract.

QuizOnline serves the SPA and the API from the same origin
(``quizonline.foxugly.com``, nginx proxies ``/api/``), so the cookie is
first-party and host-only. In dev the SPA (``localhost:4200``) and the API
(``localhost:8000``) are cross-origin but same-site, so ``Lax`` still works.

CSRF: once the cookie authenticates ``token/refresh/`` and
``token/blacklist/``, a cross-site page could try to drive them. Two guards:

* the custom ``X-Auth-Mode`` header makes every cookie-mode call a
  non-simple request, so a cross-origin caller must pass a CORS preflight
  (only ``CORS_ALLOWED_ORIGINS``, credentials on);
* every cookie-mode request must also carry an ``Origin`` that is in
  ``CORS_ALLOWED_ORIGINS`` (checked server-side, 403 otherwise). Browsers
  send ``Origin`` on every POST/DELETE, same-origin included, and prod lists
  ``https://quizonline.foxugly.com`` there.
"""

from __future__ import annotations

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

AUTH_MODE_HEADER = "X-Auth-Mode"
AUTH_MODE_COOKIE = "cookie"
# Claim carried by the refresh token (kept by rotation, copied into every
# access token minted from it) telling whether the cookie outlives the
# browser session ("remember me").
PERSIST_CLAIM = "persist"


def wants_cookie(request) -> bool:
    """True when the client opted into cookie transport for the refresh token."""
    return request.headers.get(AUTH_MODE_HEADER, "").strip().lower() == AUTH_MODE_COOKIE


def origin_allowed(request) -> bool:
    origin = request.headers.get("Origin")
    return bool(origin) and origin in settings.CORS_ALLOWED_ORIGINS


def origin_rejected_response() -> Response:
    return Response(
        {
            "code": "origin_not_allowed",
            "detail": "Cookie authentication is only accepted from an allowed origin.",
        },
        status=status.HTTP_403_FORBIDDEN,
    )


def cookie_origin_guard(request) -> Response | None:
    """403 for a cookie-mode request from an origin that is not allowed (CSRF)."""
    if wants_cookie(request) and not origin_allowed(request):
        return origin_rejected_response()
    return None


def read_refresh_cookie(request) -> str:
    return request.COOKIES.get(settings.AUTH_REFRESH_COOKIE_NAME, "")


def _persists(refresh: str) -> bool:
    # Only ever called on a token this process just minted or rotated, so the
    # signature was checked upstream; we read one claim, we do not trust it.
    try:
        token = RefreshToken(refresh, verify=False)
    except TokenError:
        return True
    return token.payload.get(PERSIST_CLAIM, True) is not False


def set_refresh_cookie(response, refresh: str) -> None:
    max_age = None
    if _persists(refresh):
        max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
    response.set_cookie(
        settings.AUTH_REFRESH_COOKIE_NAME,
        refresh,
        max_age=max_age,
        path=settings.AUTH_REFRESH_COOKIE_PATH,
        domain=None,  # host-only, never the whole foxugly.com
        secure=settings.AUTH_REFRESH_COOKIE_SECURE,
        httponly=True,
        samesite="Lax",
    )


def clear_refresh_cookie(response) -> None:
    response.delete_cookie(
        settings.AUTH_REFRESH_COOKIE_NAME,
        path=settings.AUTH_REFRESH_COOKIE_PATH,
        samesite="Lax",
    )


def session_only_pair(refresh: RefreshToken) -> dict:
    """Mark ``refresh`` as a browser-session token and return the new pair."""
    refresh[PERSIST_CLAIM] = False
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


def request_session_persists(request) -> bool:
    """The "remember me" choice of the caller's session, read from its access token."""
    payload = getattr(getattr(request, "auth", None), "payload", None) or {}
    return payload.get(PERSIST_CLAIM, True) is not False


def deliver_tokens(request, response):
    """Move ``refresh`` from the JSON body into the cookie when opted in.

    No-op for body-mode clients.
    """
    if not wants_cookie(request):
        return response
    data = getattr(response, "data", None)
    if isinstance(data, dict) and data.get("refresh"):
        refresh = data.pop("refresh")
        set_refresh_cookie(response, refresh)
    return response
