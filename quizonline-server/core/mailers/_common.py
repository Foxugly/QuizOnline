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


def render_html_email(*, heading: str, blocks: list[dict]) -> str:
    """
    Render a styled HTML email.

    Each block is a dict with:
      - type: 'text' | 'button' | 'link'
      - content: str (the text or URL)
      - label: str (for button/link, the visible text)
    """
    app_name = settings.NAME_APP
    rows = []
    for block in blocks:
        if block["type"] == "text":
            rows.append(
                f'<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.6;">'
                f'{block["content"]}</p>'
            )
        elif block["type"] == "button":
            url = block["content"]
            label = block.get("label", url)
            rows.append(
                f'<table cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">'
                f'<tr><td style="background:#1e293b;border-radius:8px;padding:12px 28px;">'
                f'<a href="{url}" style="color:#fff;text-decoration:none;font-weight:600;font-size:15px;">'
                f'{label}</a></td></tr></table>'
                f'<p style="margin:0 0 16px;font-size:12px;color:#94a3b8;">{url}</p>'
            )
        elif block["type"] == "link":
            url = block["content"]
            label = block.get("label", url)
            rows.append(
                f'<p style="margin:0 0 12px;font-size:14px;">'
                f'<a href="{url}" style="color:#2563eb;text-decoration:underline;">{label}</a>'
                f'<br><span style="font-size:12px;color:#94a3b8;">{url}</span></p>'
            )

    content = "\n".join(rows)
    return (
        '<!DOCTYPE html>'
        '<html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '</head><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">'
        '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">'
        '<tr><td align="center">'
        '<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;'
        'box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;">'
        '<tr><td style="background:#1e293b;padding:24px 32px;">'
        f'<h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">{app_name}</h1>'
        '</td></tr>'
        '<tr><td style="padding:32px;">'
        f'<h2 style="margin:0 0 20px;color:#0f172a;font-size:18px;font-weight:600;">{heading}</h2>'
        f'{content}'
        '</td></tr>'
        '<tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;'
        'text-align:center;font-size:12px;color:#94a3b8;">'
        f'{app_name}</td></tr>'
        '</table></td></tr></table></body></html>'
    )


def queue_email(subject: str, body: str, recipients: list[str], html_body: str = "") -> None:
    to = [email for email in recipients if email]
    if not to:
        return
    OutboundEmail.objects.create(subject=subject, body=body, html_body=html_body, recipients=to)
    transaction.on_commit(trigger_outbound_email_delivery)
    logger.info("email.enqueued", extra={"subject": subject, "recipients": to})


def queue_plaintext_email(subject: str, body: str, recipients: list[str]) -> None:
    queue_email(subject, body, recipients)


def send_plaintext_email(subject: str, body: str, recipients: list[str]) -> None:
    queue_plaintext_email(subject, body, recipients)


def send_user_email(*, user, subject_builder, body_builder, html_builder=None) -> None:
    email = getattr(user, "email", "")
    if not email:
        return

    with override(user_language(user)):
        subject = subject_builder(user).strip()
        body = body_builder(user)
        html_body = html_builder(user) if html_builder else ""

    queue_email(subject, body, [email], html_body)


def send_user_plaintext_email(*, user, subject_builder, body_builder) -> None:
    send_user_email(user=user, subject_builder=subject_builder, body_builder=body_builder)
