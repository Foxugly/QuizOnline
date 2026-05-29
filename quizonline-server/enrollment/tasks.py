"""Celery tasks for enrollment / course-invite lifecycle."""

from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.utils import timezone

from customuser.notifications import KIND_COURSE_INVITE_REMINDER, notify

from .models import CourseInvite
from .notifications import make_course_invite_reminder_email_callable


@shared_task
def expire_pending_course_invites() -> int:
    """Flip every pending ``CourseInvite`` past its ``expires_at``
    deadline to ``STATUS_EXPIRED``.

    Without this periodic sweep, rows only got their ``expired`` mark
    lazily when someone actually tried to accept them — meaning the
    instructor-facing invites table kept showing them as ``pending``
    forever, the catalog visibility filter kept exposing the course
    to invitees who could no longer accept, and the audit trail
    drifted from reality. Returns the count of rows updated so the
    Celery logs make the sweep visible.
    """
    now = timezone.now()
    return CourseInvite.objects.filter(
        status=CourseInvite.STATUS_PENDING,
        expires_at__lt=now,
    ).update(status=CourseInvite.STATUS_EXPIRED, updated_at=now)


@shared_task
def send_course_invite_reminders() -> int:
    """Email a J-3 reminder to invitees whose pending invitation is
    about to expire.

    Why a separate sweep instead of inlining this into
    :func:`expire_pending_course_invites`: the two cadences are
    independent (a 1 h expiration sweep + a daily reminder sweep is
    fine, but reminders need a separate per-row stamp so we never
    spam someone twice). The window also moves: ``expires_at`` is set
    at invite-creation, while the reminder threshold is configurable
    at runtime via :setting:`LMS_COURSE_INVITE_REMINDER_HOURS_BEFORE`.

    Idempotency: every row carries a ``reminder_sent_at`` field that
    the filter excludes once set — so the operator can run the task
    every hour and only fresh rows actually trigger a send. The stamp
    is reset by :func:`resend_course_invite` whenever an instructor
    manually re-issues, so a renewed invitation will get its own
    reminder once it approaches the new expiry.

    Returns the number of reminders sent so Celery beat logs show
    activity even on quiet days.
    """
    hours_before = int(getattr(settings, "LMS_COURSE_INVITE_REMINDER_HOURS_BEFORE", 72))
    if hours_before <= 0:
        return 0
    now = timezone.now()
    threshold = now + timedelta(hours=hours_before)
    queryset = (
        CourseInvite.objects.select_related("course", "invitee")
        .filter(
            status=CourseInvite.STATUS_PENDING,
            reminder_sent_at__isnull=True,
            expires_at__gt=now,
            expires_at__lte=threshold,
        )
    )
    sent = 0
    for invite in queryset:
        # Stamp first, then notify. If the email queue blows up the
        # row is still flagged — we want at-most-once delivery, since
        # a duplicate reminder is worse than an occasional missed
        # one (and the invitee can still see the invitation in
        # /me/invitations regardless).
        CourseInvite.objects.filter(pk=invite.pk).update(reminder_sent_at=now)
        invite.reminder_sent_at = now
        notify(
            user=invite.invitee,
            kind=KIND_COURSE_INVITE_REMINDER,
            payload={
                "course_id": invite.course_id,
                "course_slug": invite.course.slug,
                "invite_token": invite.token,
                "expires_at": invite.expires_at.isoformat(),
            },
            domain=invite.course.domain,
            email_callable=make_course_invite_reminder_email_callable(invite),
        )
        sent += 1
    return sent
