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


def _build_invite_accept_url(invite) -> str:
    """Absolute URL the invitee clicks to land on the acceptance page.

    The frontend route lives under ``/lms/course-invite/<token>/`` —
    we prefix it with the configured ``FRONTEND_BASE_URL`` so emails
    work whether the mail server resolves relative links or not.
    """
    base = getattr(settings, "FRONTEND_BASE_URL", "").rstrip("/")
    return f"{base}/lms/course-invite/{invite.token}"


def _on_commit(callable_) -> None:
    """Hook a function onto the current transaction's commit so emails
    only go out after the DB write actually succeeds. Used by the
    course-invite email callables — the orchestrator
    ``customuser.notifications.notify`` calls them immediately, so we
    defer the actual ``send_mail`` ourselves."""
    transaction.on_commit(callable_)


def make_course_invite_received_email_callable(invite):
    """Return a zero-arg callable that emails the invitee. Used by
    ``customuser.notifications.notify(email_callable=...)`` so the
    domain × user pref intersection decides whether to actually fire.
    Sends are deferred to ``transaction.on_commit`` so a failed
    transaction does not leak an email about a row that never
    persisted.

    The context exposes the course's localised description so the
    invitee can see what the course is about straight from the
    inbox, without having to click through to the acceptance page
    just to find out."""
    def _send():
        def _do_send():
            lang = invite.invitee.language or "fr"
            with translation.override(lang):
                subject = _("Invitation to join %(course)s") % {
                    "course": invite.course.safe_translation_getter(
                        "title", language_code=lang, any_language=True,
                    ) or "",
                }
            course_description = invite.course.safe_translation_getter(
                "description", language_code=lang, any_language=True,
            ) or ""
            _send_html_email(
                to_email=invite.invitee.email, subject=subject,
                template_base="course-invite-received",
                context={
                    "invite": invite,
                    "accept_url": _build_invite_accept_url(invite),
                    "course_description": course_description,
                    "course_estimated_duration": invite.course.estimated_duration,
                },
                lang=lang,
            )
        _on_commit(_do_send)
    return _send


def make_course_invite_sent_email_callable(invite):
    """Confirmation email to the inviter — same on-commit deferral."""
    def _send():
        def _do_send():
            if invite.inviter is None or not invite.inviter.email:
                return
            lang = invite.inviter.language or "fr"
            with translation.override(lang):
                subject = _("Invitation sent for %(course)s") % {
                    "course": invite.course.safe_translation_getter(
                        "title", language_code=lang, any_language=True,
                    ) or "",
                }
            _send_html_email(
                to_email=invite.inviter.email, subject=subject,
                template_base="course-invite-sent",
                context={"invite": invite}, lang=lang,
            )
        _on_commit(_do_send)
    return _send


def _build_course_inscriptions_url(course) -> str:
    """Deep-link to the course-edit Inscriptions tab — instructors land
    on the page they need to act from. Uses a query param for tab
    selection so a future tab redesign that survives the slug stays
    backward-compatible."""
    base = getattr(settings, "FRONTEND_BASE_URL", "").rstrip("/")
    return f"{base}/lms/course/{course.id}/edit?tab=enrollment"


def make_course_enrollment_request_email_callable(enrollment, instructor):
    """Return a zero-arg callable that emails ``instructor`` about
    the pending enrollment request. ``transaction.on_commit`` defers
    the actual send so a failed enrollment transaction does not leak
    an email about a row that never persisted."""
    def _send():
        def _do_send():
            if not instructor or not instructor.email:
                return
            lang = instructor.language or "fr"
            with translation.override(lang):
                subject = _("New enrollment request for %(course)s") % {
                    "course": enrollment.course.safe_translation_getter(
                        "title", language_code=lang, any_language=True,
                    ) or "",
                }
            _send_html_email(
                to_email=instructor.email, subject=subject,
                template_base="enrollment-request",
                context={
                    "enrollment": enrollment,
                    "instructor": instructor,
                    "inscriptions_url": _build_course_inscriptions_url(enrollment.course),
                },
                lang=lang,
            )
        _on_commit(_do_send)
    return _send


def make_course_invite_accepted_email_callable(invite):
    """Notification to the inviter that the invitee accepted — on-commit."""
    def _send():
        def _do_send():
            if invite.inviter is None or not invite.inviter.email:
                return
            lang = invite.inviter.language or "fr"
            with translation.override(lang):
                subject = _("%(invitee)s accepted your invitation") % {
                    "invitee": invite.invitee.get_display_name(),
                }
            _send_html_email(
                to_email=invite.inviter.email, subject=subject,
                template_base="course-invite-accepted",
                context={"invite": invite}, lang=lang,
            )
        _on_commit(_do_send)
    return _send
