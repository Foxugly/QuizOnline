"""Refresh / logout endpoints that also speak the HttpOnly refresh cookie.

See ``customuser/refresh_cookie.py`` for the design.
"""

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenBlacklistView, TokenRefreshView

from . import refresh_cookie
from .token_serializers import (
    AUTH_MODE_PARAMETER,
    CookieTokenBlacklistSerializer,
    CookieTokenRefreshSerializer,
    OriginRejectedSerializer,
)

_ORIGIN_REJECTED = OpenApiResponse(
    response=OriginRejectedSerializer,
    description="Cookie mode from an origin that is not allowed (code=origin_not_allowed)",
)


def _request_token(request) -> str:
    data = request.data
    token = data.get("refresh") if hasattr(data, "get") else None
    return token if isinstance(token, str) else ""


@extend_schema(
    summary="Refresh a token",
    description=(
        "Generates a new access token and rotates the refresh token (the presented "
        "one is blacklisted). Body mode: `{refresh}` in, `{access, refresh}` out. "
        "Cookie mode (`X-Auth-Mode: cookie`): the body `refresh` is optional; when "
        "absent the HttpOnly cookie is used (401 `refresh_cookie_missing` if there is "
        "none); the rotated token is set in the cookie and omitted from the body. A "
        "body token sent in cookie mode is the one-time migration path for SPAs that "
        "still hold one in storage."
    ),
    request=CookieTokenRefreshSerializer,
    parameters=[AUTH_MODE_PARAMETER],
    responses={
        200: CookieTokenRefreshSerializer,
        401: OpenApiResponse(
            description=(
                "Refresh token invalid, expired or blacklisted (code=token_not_valid), "
                "or no refresh cookie in cookie mode (code=refresh_cookie_missing)"
            ),
        ),
        403: _ORIGIN_REJECTED,
    },
)
class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        if not refresh_cookie.wants_cookie(request):
            return super().post(request, *args, **kwargs)

        if (rejected := refresh_cookie.cookie_origin_guard(request)) is not None:
            return rejected
        token = _request_token(request) or refresh_cookie.read_refresh_cookie(request)
        if not token:
            return Response(
                {"code": "refresh_cookie_missing", "detail": "No refresh cookie: sign in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        serializer = TokenRefreshSerializer(data={"refresh": token})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(exc.args[0]) from exc
        return refresh_cookie.deliver_tokens(
            request, Response(dict(serializer.validated_data), status=status.HTTP_200_OK)
        )


@extend_schema(
    summary="Logout",
    description=(
        "Blacklists a refresh token. Body mode: `{refresh}` required, 200. Cookie "
        "mode (`X-Auth-Mode: cookie`): blacklists the body token or else the HttpOnly "
        "cookie, always clears the cookie and answers 204 (idempotent)."
    ),
    request=CookieTokenBlacklistSerializer,
    parameters=[AUTH_MODE_PARAMETER],
    responses={
        200: OpenApiResponse(description="Body mode: token blacklisted"),
        204: OpenApiResponse(description="Cookie mode: signed out, cookie cleared"),
        401: OpenApiResponse(description="Body mode: invalid or expired refresh token"),
        403: _ORIGIN_REJECTED,
    },
)
class CookieTokenBlacklistView(TokenBlacklistView):
    def post(self, request, *args, **kwargs):
        if not refresh_cookie.wants_cookie(request):
            return super().post(request, *args, **kwargs)

        if (rejected := refresh_cookie.cookie_origin_guard(request)) is not None:
            return rejected
        token = _request_token(request) or refresh_cookie.read_refresh_cookie(request)
        if token:
            try:
                RefreshToken(token).blacklist()
            except TokenError:
                # Idempotent: expired / already revoked still signs the browser out.
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        refresh_cookie.clear_refresh_cookie(response)
        return response
