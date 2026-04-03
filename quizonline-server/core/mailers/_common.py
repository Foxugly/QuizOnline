import logging
from django.db import transaction

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.utils.translation import override

from core.models import OutboundEmail
from core.delivery import trigger_outbound_email_delivery

logger = logging.getLogger(__name__)


def frontend_url(path: str) -> str:
    return f"{settings.FRONTEND_BASE_URL.rstrip('/')}/{path.lstrip('/')}"


def build_user_token_link(path_prefix: str, user) -> str:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return frontend_url(f"{path_prefix.rstrip('/')}/{uid}/{token}")


def format_datetime(value, language_code: str | None = None) -> str:
    if not value:
        return ""
    normalized = normalize_language_code(language_code)
    localized = timezone.localtime(value)
    if normalized == "fr":
        return localized.strftime("%d/%m/%Y %H:%M:%S %Z")
    if normalized == "nl":
        return localized.strftime("%d-%m-%Y %H:%M:%S %Z")
    return localized.strftime("%Y-%m-%d %H:%M:%S %Z")


def normalize_language_code(language_code: str | None) -> str:
    known_codes = {code for code, _ in settings.LANGUAGES}
    if language_code in known_codes:
        return language_code
    return settings.LANGUAGE_CODE


def user_language(user) -> str:
    return normalize_language_code(getattr(user, "language", None))


def queue_plaintext_email(subject: str, body: str, recipients: list[str]) -> None:
    to = [email for email in recipients if email]
    if not to:
        return
    OutboundEmail.objects.create(subject=subject, body=body, recipients=to)
    transaction.on_commit(trigger_outbound_email_delivery)
    logger.info("email.enqueued", extra={"subject": subject, "recipients": to})


def send_plaintext_email(subject: str, body: str, recipients: list[str]) -> None:
    queue_plaintext_email(subject, body, recipients)


def send_user_plaintext_email(*, user, subject_builder, body_builder) -> None:
    email = getattr(user, "email", "")
    if not email:
        return

    with override(user_language(user)):
        subject = subject_builder(user).strip()
        body = body_builder(user)

    queue_plaintext_email(subject, body, [email])
