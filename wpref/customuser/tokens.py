from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth import get_user_model
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode

User = get_user_model()


def resolve_user_from_uid(uid: str):
    try:
        uid_int = force_str(urlsafe_base64_decode(uid))
        return User.objects.get(pk=uid_int)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        return None


def token_is_valid(user, token: str) -> bool:
    return bool(user) and default_token_generator.check_token(user, token)
