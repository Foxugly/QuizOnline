"""Email notification for an approaching free-plan deadline."""

from __future__ import annotations

from django.template.loader import render_to_string
from django.utils import translation
from django.utils.translation import gettext as _

from core.mailers._common import queue_email


def _send_html_email(*, to_email: str, subject: str, template_base: str, context: dict, lang: str) -> None:
    if not to_email:
        return
    with translation.override(lang):
        html_body = render_to_string(f"emails/lms/{template_base}.html", context)
        text_body = render_to_string(f"emails/lms/{template_base}.txt", context)
    queue_email(subject, text_body, [to_email], html_body)


def notify_billing_deadline(billing, *, days: int) -> None:
    """Email the domain owner that the free-plan deadline is approaching,
    with the current member count and the monthly price that will apply.
    Called from the billing beat task (already outside a request)."""
    owner = billing.domain.owner
    if owner is None:
        return
    lang = getattr(owner, "language", None) or "fr"
    domain_name = billing.domain.safe_translation_getter(
        "name", language_code=lang, any_language=True,
    )
    with translation.override(lang):
        subject = _("Your QuizOnline free period for %(domain)s ends soon") % {
            "domain": domain_name,
        }
    _send_html_email(
        to_email=owner.email,
        subject=subject,
        template_base="billing-deadline-reminder",
        context={
            "domain_name": domain_name,
            "days": days,
            "member_count": billing.member_count,
            "monthly_price": billing.monthly_price_eur_htva,
        },
        lang=lang,
    )
