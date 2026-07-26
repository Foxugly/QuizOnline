from rest_framework.throttling import AnonRateThrottle
from rest_framework.throttling import UserRateThrottle


class TokenObtainRateThrottle(AnonRateThrottle):
    scope = "token_obtain"


class RegisterRateThrottle(AnonRateThrottle):
    """Cap how often a single IP can create accounts. Registration is
    otherwise only guarded by Turnstile, which is disabled when
    ``TURNSTILE_SECRET_KEY`` is empty — without this a missing captcha
    secret would allow mass account creation / email bombing."""
    scope = "register"


class PasswordResetRateThrottle(AnonRateThrottle):
    scope = "password_reset"


class PasswordResetConfirmRateThrottle(AnonRateThrottle):
    scope = "password_reset_confirm"


class EmailConfirmRateThrottle(AnonRateThrottle):
    scope = "email_confirm"


class QuizAnswerRateThrottle(UserRateThrottle):
    scope = "quiz_answer"


class MagicLinkRequestRateThrottle(AnonRateThrottle):
    """Cap how often a single IP can ask for a sign-in link."""
    scope = "magic_link_request"


class MagicLinkExchangeRateThrottle(AnonRateThrottle):
    """Cap exchange attempts (used both for valid + invalid tokens)."""
    scope = "magic_link_exchange"
