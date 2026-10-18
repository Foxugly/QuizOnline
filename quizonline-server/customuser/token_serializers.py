"""OpenAPI shapes of the token endpoints with the optional refresh cookie."""

from drf_spectacular.utils import OpenApiParameter, extend_schema_serializer
from rest_framework import serializers

AUTH_MODE_PARAMETER = OpenApiParameter(
    name="X-Auth-Mode",
    type=str,
    location=OpenApiParameter.HEADER,
    required=False,
    enum=["cookie"],
    description=(
        "Web SPA only. `cookie` moves the refresh token into an HttpOnly, Secure, "
        "SameSite=Lax cookie scoped to `/api/v1/token/` (and omits `refresh` from the "
        "body); the request's `Origin` must then be in CORS_ALLOWED_ORIGINS (403 "
        "`origin_not_allowed`). Absent: body tokens."
    ),
)

REFRESH_COOKIE_NOTE = (
    " Omitted when the request sent `X-Auth-Mode: cookie`: the token is then "
    "set in the HttpOnly refresh cookie instead."
)

REFRESH_FROM_COOKIE_NOTE = (
    " Required in body mode; in cookie mode (`X-Auth-Mode: cookie`) the HttpOnly "
    "refresh cookie is used when omitted."
)


@extend_schema_serializer(component_name="TokenObtainPair")
class TokenPairSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField(required=False, help_text="Refresh token." + REFRESH_COOKIE_NOTE)


@extend_schema_serializer(component_name="TokenRefresh")
class CookieTokenRefreshSerializer(serializers.Serializer):
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(
        required=False,
        help_text=(
            "Request: the refresh token." + REFRESH_FROM_COOKIE_NOTE
            + " Response: the rotated refresh token." + REFRESH_COOKIE_NOTE
        ),
    )


@extend_schema_serializer(component_name="TokenBlacklist")
class CookieTokenBlacklistSerializer(serializers.Serializer):
    refresh = serializers.CharField(
        write_only=True,
        required=False,
        help_text="Refresh token to revoke." + REFRESH_FROM_COOKIE_NOTE,
    )


class OriginRejectedSerializer(serializers.Serializer):
    code = serializers.CharField()
    detail = serializers.CharField()


class PasswordChangeResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    access = serializers.CharField(help_text="Fresh access token for the calling session.")
    refresh = serializers.CharField(
        required=False,
        help_text=(
            "Fresh refresh token: every previously issued refresh token is now "
            "revoked, so the client MUST keep this one." + REFRESH_COOKIE_NOTE
        ),
    )
