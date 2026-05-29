"""On-commit email notifications for LMS certificate events."""

from __future__ import annotations

from django.db import transaction
from django.template.loader import render_to_string
from django.utils import translation
from django.utils.translation import gettext as _

from core.mailers._common import queue_email


def _send_html_email(*, to_email: str, subject: str, template_base: str, context: dict, lang: str) -> None:
    """Render an LMS email template and hand it off to the
    ``OutboundEmail`` outbox. Mirrors :mod:`enrollment.notifications`'
    helper so we don't introduce a cross-app import for a one-liner."""
    if not to_email:
        return
    with translation.override(lang):
        html_body = render_to_string(f"emails/lms/{template_base}.html", context)
        text_body = render_to_string(f"emails/lms/{template_base}.txt", context)
    queue_email(subject, text_body, [to_email], html_body)


def notify_certificate_issued_on_commit(cert) -> None:
    def _send():
        lang = cert.user.language or "fr"
        with translation.override(lang):
            subject = _("Your certificate for %(course)s is ready") % {
                "course": cert.course.safe_translation_getter("title", language_code=lang, any_language=True),
            }
        _send_html_email(
            to_email=cert.user.email, subject=subject,
            template_base="certificate-issued",
            context={"cert": cert}, lang=lang,
        )
    transaction.on_commit(_send)
