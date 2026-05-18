"""On-commit email notifications for LMS enrollment events."""

from __future__ import annotations

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import translation
from django.utils.translation import gettext as _


def _send_html_email(*, to_email: str, subject: str, template_base: str, context: dict, lang: str) -> None:
    if not to_email:
        return
    with translation.override(lang):
        html_body = render_to_string(f"emails/lms/{template_base}.html", context)
        text_body = render_to_string(f"emails/lms/{template_base}.txt", context)
        send_mail(
            subject=subject,
            message=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to_email],
            html_message=html_body,
        )


def notify_enrollment_created_on_commit(enrollment) -> None:
    def _send():
        lang = enrollment.user.language or "fr"
        with translation.override(lang):
            subject = _("Welcome to %(course)s") % {
                "course": enrollment.course.safe_translation_getter("title", language_code=lang, any_language=True),
            }
        _send_html_email(
            to_email=enrollment.user.email, subject=subject,
            template_base="enrollment-created",
            context={"enrollment": enrollment}, lang=lang,
        )
    transaction.on_commit(_send)


def notify_enrollment_approved_on_commit(enrollment) -> None:
    def _send():
        lang = enrollment.user.language or "fr"
        with translation.override(lang):
            subject = _("Your enrollment to %(course)s was approved") % {
                "course": enrollment.course.safe_translation_getter("title", language_code=lang, any_language=True),
            }
        _send_html_email(
            to_email=enrollment.user.email, subject=subject,
            template_base="enrollment-approved",
            context={"enrollment": enrollment}, lang=lang,
        )
    transaction.on_commit(_send)


def notify_enrollment_rejected_on_commit(enrollment) -> None:
    def _send():
        lang = enrollment.user.language or "fr"
        with translation.override(lang):
            subject = _("Your enrollment to %(course)s was not approved") % {
                "course": enrollment.course.safe_translation_getter("title", language_code=lang, any_language=True),
            }
        _send_html_email(
            to_email=enrollment.user.email, subject=subject,
            template_base="enrollment-rejected",
            context={"enrollment": enrollment}, lang=lang,
        )
    transaction.on_commit(_send)


def notify_course_completed_on_commit(*, user, course) -> None:
    def _send():
        lang = user.language or "fr"
        with translation.override(lang):
            subject = _("You completed %(course)s") % {
                "course": course.safe_translation_getter("title", language_code=lang, any_language=True),
            }
        _send_html_email(
            to_email=user.email, subject=subject,
            template_base="course-completed",
            context={"user": user, "course": course}, lang=lang,
        )
    transaction.on_commit(_send)


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
