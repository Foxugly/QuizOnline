from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import (
    PasswordResetTokenGenerator,
    default_token_generator,
)
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode

User = get_user_model()


class EmailConfirmationTokenGenerator(PasswordResetTokenGenerator):
    """E-mail confirmation tokens, kept apart from password-reset tokens:

    - own ``key_salt``, so a confirmation token is never accepted by the
      password-reset endpoint (and vice versa);
    - the hash covers ``email_confirmed`` and ``email``, so the token dies as
      soon as the address is confirmed (single use) or changed.
    """

    key_salt = "customuser.tokens.EmailConfirmationTokenGenerator"

    def _make_hash_value(self, user, timestamp):
        return (
            f"{super()._make_hash_value(user, timestamp)}"
            f"{bool(getattr(user, 'email_confirmed', False))}{user.email or ''}"
        )


email_confirmation_token_generator = EmailConfirmationTokenGenerator()
# Password reset keeps Django's generator: its hash covers the password hash
# and ``last_login``, so a reset link dies after use or after a login.
password_reset_token_generator = default_token_generator


def resolve_user_from_uid(uid: str):
    try:
        uid_int = force_str(urlsafe_base64_decode(uid))
        return User.objects.get(pk=uid_int)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        return None


def token_is_valid(user, token: str, generator=password_reset_token_generator) -> bool:
    return bool(user) and generator.check_token(user, token)
