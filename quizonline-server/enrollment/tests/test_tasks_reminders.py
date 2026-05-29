"""Coverage for ``enrollment.tasks.send_course_invite_reminders``.

Before this file the reminder sweep was uncovered: the idempotency
stamp (``reminder_sent_at``) and the configurable
``LMS_COURSE_INVITE_REMINDER_HOURS_BEFORE`` lever could regress
silently and learners would stop getting the J-3 reminder mail.
"""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.test import override_settings
from django.utils import timezone

from course.models import Course
from enrollment.models import CourseInvite
from enrollment.services import invite_user_to_course
from enrollment.tasks import send_course_invite_reminders


@pytest.fixture
def invite_course(course):
    course.enrollment_mode = Course.ENROLL_INVITE
    course.is_published = True
    course.save()
    return course


def _move_invite_into_window(invite, *, hours_left: int):
    """Pull an invite's ``expires_at`` into the reminder window so the
    sweep picks it up. The reminder threshold is
    ``LMS_COURSE_INVITE_REMINDER_HOURS_BEFORE`` (default 72) — anything
    expiring within that window AND in the future is a candidate."""
    invite.expires_at = timezone.now() + timedelta(hours=hours_left)
    invite.reminder_sent_at = None
    invite.save(update_fields=["expires_at", "reminder_sent_at"])


@pytest.mark.django_db
@override_settings(LMS_COURSE_INVITE_REMINDER_HOURS_BEFORE=72)
def test_reminder_sent_for_invite_in_window(invite_course, learner, owner):
    invite = invite_user_to_course(course=invite_course, invitee=learner, inviter=owner)
    _move_invite_into_window(invite, hours_left=24)

    sent = send_course_invite_reminders()

    assert sent == 1
    invite.refresh_from_db()
    assert invite.reminder_sent_at is not None


@pytest.mark.django_db
@override_settings(LMS_COURSE_INVITE_REMINDER_HOURS_BEFORE=72)
def test_reminder_is_idempotent_on_repeated_runs(invite_course, learner, owner):
    """Calling the sweep twice in a row sends exactly one reminder —
    the ``reminder_sent_at`` stamp gates the second pass."""
    invite = invite_user_to_course(course=invite_course, invitee=learner, inviter=owner)
    _move_invite_into_window(invite, hours_left=24)

    first = send_course_invite_reminders()
    second = send_course_invite_reminders()

    assert first == 1
    assert second == 0


@pytest.mark.django_db
@override_settings(LMS_COURSE_INVITE_REMINDER_HOURS_BEFORE=0)
def test_reminder_disabled_when_hours_before_zero(invite_course, learner, owner):
    """``LMS_COURSE_INVITE_REMINDER_HOURS_BEFORE=0`` turns the sweep
    into a no-op: zero rows updated and zero notifications fired."""
    invite = invite_user_to_course(course=invite_course, invitee=learner, inviter=owner)
    _move_invite_into_window(invite, hours_left=24)

    sent = send_course_invite_reminders()

    assert sent == 0
    invite.refresh_from_db()
    assert invite.reminder_sent_at is None


@pytest.mark.django_db
@override_settings(LMS_COURSE_INVITE_REMINDER_HOURS_BEFORE=72)
def test_reminder_skips_invite_outside_window(invite_course, learner, owner):
    """An invite that expires later than the threshold is not yet a
    reminder candidate."""
    invite = invite_user_to_course(course=invite_course, invitee=learner, inviter=owner)
    _move_invite_into_window(invite, hours_left=200)  # well outside the 72h window

    sent = send_course_invite_reminders()

    assert sent == 0
    invite.refresh_from_db()
    assert invite.reminder_sent_at is None


@pytest.mark.django_db
@override_settings(LMS_COURSE_INVITE_REMINDER_HOURS_BEFORE=72)
def test_reminder_skips_non_pending_invite(invite_course, learner, owner):
    """A non-pending invite never triggers a reminder."""
    invite = invite_user_to_course(course=invite_course, invitee=learner, inviter=owner)
    _move_invite_into_window(invite, hours_left=24)
    CourseInvite.objects.filter(pk=invite.pk).update(status=CourseInvite.STATUS_REVOKED)

    sent = send_course_invite_reminders()

    assert sent == 0
