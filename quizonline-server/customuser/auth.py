from __future__ import annotations

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import serializers, status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from . import refresh_cookie
from .throttling import TokenObtainRateThrottle
from .token_serializers import (
    AUTH_MODE_PARAMETER,
    OriginRejectedSerializer,
    TokenPairSerializer,
)


class EmailConfirmedTokenObtainPairSerializer(TokenObtainPairSerializer):
    default_error_messages = {
        **TokenObtainPairSerializer.default_error_messages,
        "email_not_confirmed": "Confirmez votre adresse email avant de vous connecter.",
    }

    remember_me = serializers.BooleanField(
        required=False,
        default=True,
        write_only=True,
        help_text=(
            "Cookie mode only (`X-Auth-Mode: cookie`): false makes the refresh "
            "cookie a browser-session cookie (no Max-Age). Ignored in body mode."
        ),
    )

    @classmethod
    def get_token(cls, user):
        return super().get_token(user)

    def validate(self, attrs):
        # Read by the view: ``validate`` returns the token pair, not ``attrs``.
        self.remember_me = attrs.get("remember_me", True)
        data = super().validate(attrs)
        user = getattr(self, "user", None)
        if user and getattr(user, "email_confirmed", False) is not True:
            # ``code`` is echoed in the body (DRF only keeps ``detail`` for a
            # plain string) so the frontend can map it to a translated message
            # instead of showing the raw backend text. ``detail`` is unchanged.
            raise AuthenticationFailed(
                {
                    "detail": self.error_messages["email_not_confirmed"],
                    "code": "email_not_confirmed",
                },
                code="email_not_confirmed",
            )
        return data


@extend_schema(
    parameters=[AUTH_MODE_PARAMETER],
    responses={
        200: TokenPairSerializer,
        401: OpenApiResponse(description="Invalid credentials or e-mail not confirmed"),
        403: OpenApiResponse(
            response=OriginRejectedSerializer,
            description="Cookie mode from an origin that is not allowed (code=origin_not_allowed)",
        ),
    },
)
class EmailConfirmedTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailConfirmedTokenObtainPairSerializer
    throttle_classes = [TokenObtainRateThrottle]

    def post(self, request, *args, **kwargs):
        if (rejected := refresh_cookie.cookie_origin_guard(request)) is not None:
            return rejected
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(exc.args[0]) from exc
        data = dict(serializer.validated_data)
        if refresh_cookie.wants_cookie(request) and not serializer.remember_me:
            data.update(refresh_cookie.session_only_pair(RefreshToken(data["refresh"])))
        return refresh_cookie.deliver_tokens(request, Response(data, status=status.HTTP_200_OK))
