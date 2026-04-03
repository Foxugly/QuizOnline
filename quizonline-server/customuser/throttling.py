from rest_framework.throttling import AnonRateThrottle


class TokenObtainRateThrottle(AnonRateThrottle):
    scope = "token_obtain"


class PasswordResetRateThrottle(AnonRateThrottle):
    scope = "password_reset"
