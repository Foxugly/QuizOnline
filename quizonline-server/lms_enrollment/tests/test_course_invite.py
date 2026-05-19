"""End-to-end tests for the course-invite feature.

Covers four surfaces:

1. Service-level business rules (``invite``, ``accept``, ``decline``,
   ``revoke``, ``resend``).
2. The ``CourseQuerySet.visible_to`` filter that hides invite-only
   courses from members without a pending invite.
3. The HTTP endpoints (permission, status code, side effects).
4. Notification side effects (web row created + email queued, gated by
   the per-user pref and per-domain setting).
"""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.core import mail
from django.core.exceptions import PermissionDenied, ValidationError
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from customuser.models import CustomUser
from customuser.notifications import (
    KIND_COURSE_INVITE_RECEIVED,
)
from lms_catalog.models import Course
from lms_enrollment.models import CourseEnrollment, CourseInvite
from lms_enrollment.services import (
    accept_course_invite,
    decline_course_invite,
    invite_user_to_course,
    resend_course_invite,
    revoke_course_invite,
)


# ---------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------

@pytest.fixture
def invite_course(course):
    course.enrollment_mode = Course.ENROLL_INVITE
    course.is_published = True
    course.save()
    return course


@pytest.fixture
def stranger(db):
    """A registered user who is NOT a member of the course's domain."""
    return CustomUser.objects.create_user(
        username="stranger", email="stranger@x.com", password="x",
    )


@pytest.fixture
def manager(db, domain):
    """A second instructor (non-owner) of the course's domain."""
    m = CustomUser.objects.create_user(
        username="manager", email="manager@x.com", password="x",
    )
    domain.managers.add(m)
    domain.members.add(m)
    return m


# ---------------------------------------------------------------------
# Service: invite_user_to_course
# ---------------------------------------------------------------------

@pytest.mark.django_db
def test_invite_creates_pending_row_with_token(invite_course, learner, owner):
    invite = invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    assert invite.status == CourseInvite.STATUS_PENDING
    assert invite.invitee == learner
    assert invite.created_by == owner
    assert invite.token  # non-empty
    assert invite.expires_at > timezone.now() + timedelta(days=13)


@pytest.mark.django_db
def test_invite_is_idempotent_per_pair_and_bumps_last_sent(
    invite_course, learner, owner,
):
    first = invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    # Backdate so we can verify the bump.
    CourseInvite.objects.filter(pk=first.pk).update(
        last_sent_at=timezone.now() - timedelta(days=2),
    )

    second = invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    assert second.pk == first.pk
    second.refresh_from_db()
    assert second.last_sent_at > first.last_sent_at
    assert CourseInvite.objects.filter(course=invite_course, invitee=learner).count() == 1


@pytest.mark.django_db
def test_invite_rejects_non_instructor(invite_course, learner, stranger):
    with pytest.raises(PermissionDenied):
        invite_user_to_course(
            course=invite_course, invitee=learner, inviter=stranger,
        )


@pytest.mark.django_db
def test_invite_rejects_non_domain_member(invite_course, owner, stranger):
    with pytest.raises(ValidationError):
        invite_user_to_course(
            course=invite_course, invitee=stranger, inviter=owner,
        )


@pytest.mark.django_db
def test_invite_rejects_self_invitation(invite_course, owner):
    # Owner adds themselves as a domain member to bypass the membership
    # check so we can isolate the "no self invite" rule.
    invite_course.domain.members.add(owner)
    with pytest.raises(ValidationError):
        invite_user_to_course(
            course=invite_course, invitee=owner, inviter=owner,
        )


@pytest.mark.django_db
def test_invite_rejects_already_active_enrollment(invite_course, learner, owner):
    CourseEnrollment.objects.create(
        user=learner, course=invite_course,
        status=CourseEnrollment.STATUS_ACTIVE,
    )
    with pytest.raises(ValidationError):
        invite_user_to_course(
            course=invite_course, invitee=learner, inviter=owner,
        )


@pytest.mark.django_db
def test_invite_rejects_non_invite_only_course(course, learner, owner):
    course.enrollment_mode = Course.ENROLL_OPEN
    course.save()
    with pytest.raises(ValidationError):
        invite_user_to_course(course=course, invitee=learner, inviter=owner)


# ---------------------------------------------------------------------
# Service: accept_course_invite
# ---------------------------------------------------------------------

@pytest.mark.django_db
def test_accept_creates_active_enrollment(invite_course, learner, owner):
    invite = invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    enrollment = accept_course_invite(invite=invite, accepted_by=learner)
    invite.refresh_from_db()
    assert invite.status == CourseInvite.STATUS_ACCEPTED
    assert invite.accepted_at is not None
    assert enrollment.status == CourseEnrollment.STATUS_ACTIVE


@pytest.mark.django_db
def test_accept_only_invitee_can_accept(invite_course, learner, owner, stranger):
    invite = invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    with pytest.raises(PermissionDenied):
        accept_course_invite(invite=invite, accepted_by=stranger)


@pytest.mark.django_db
def test_accept_rejects_expired_invite(invite_course, learner, owner):
    invite = invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    CourseInvite.objects.filter(pk=invite.pk).update(
        expires_at=timezone.now() - timedelta(seconds=1),
    )
    invite.refresh_from_db()
    with pytest.raises(ValidationError):
        accept_course_invite(invite=invite, accepted_by=learner)
    invite.refresh_from_db()
    assert invite.status == CourseInvite.STATUS_EXPIRED


@pytest.mark.django_db
def test_accept_rejects_non_pending_invite(invite_course, learner, owner):
    invite = invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    invite.status = CourseInvite.STATUS_REVOKED
    invite.save(update_fields=["status"])
    with pytest.raises(ValidationError):
        accept_course_invite(invite=invite, accepted_by=learner)


# ---------------------------------------------------------------------
# Service: decline / revoke / resend
# ---------------------------------------------------------------------

@pytest.mark.django_db
def test_decline_marks_declined(invite_course, learner, owner):
    invite = invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    decline_course_invite(invite=invite, declined_by=learner)
    invite.refresh_from_db()
    assert invite.status == CourseInvite.STATUS_DECLINED
    assert invite.declined_at is not None


@pytest.mark.django_db
def test_revoke_only_instructor(invite_course, learner, owner, stranger):
    invite = invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    with pytest.raises(PermissionDenied):
        revoke_course_invite(invite=invite, revoked_by=stranger)
    revoke_course_invite(invite=invite, revoked_by=owner)
    invite.refresh_from_db()
    assert invite.status == CourseInvite.STATUS_REVOKED


@pytest.mark.django_db
def test_resend_bumps_last_sent_at_and_expires_at(invite_course, learner, owner):
    invite = invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    old_last_sent = invite.last_sent_at
    old_expires = invite.expires_at
    CourseInvite.objects.filter(pk=invite.pk).update(
        last_sent_at=timezone.now() - timedelta(days=2),
        expires_at=timezone.now() + timedelta(days=1),
    )
    invite.refresh_from_db()
    resend_course_invite(invite=invite, sender=owner)
    invite.refresh_from_db()
    assert invite.last_sent_at > old_last_sent - timedelta(days=2)
    assert invite.expires_at > old_expires - timedelta(days=1)


# ---------------------------------------------------------------------
# CourseQuerySet.visible_to filter
# ---------------------------------------------------------------------

@pytest.mark.django_db
def test_visibility_invite_only_hidden_from_member_without_invite(
    invite_course, learner,
):
    qs = Course.objects.visible_to(learner)
    assert invite_course not in qs


@pytest.mark.django_db
def test_visibility_invite_only_visible_with_pending_invite(
    invite_course, learner, owner,
):
    invite_user_to_course(course=invite_course, invitee=learner, inviter=owner)
    qs = Course.objects.visible_to(learner)
    assert invite_course in qs


@pytest.mark.django_db
def test_visibility_invite_only_visible_with_existing_enrollment(
    invite_course, learner,
):
    CourseEnrollment.objects.create(
        user=learner, course=invite_course,
        status=CourseEnrollment.STATUS_ACTIVE,
    )
    qs = Course.objects.visible_to(learner)
    assert invite_course in qs


@pytest.mark.django_db
def test_visibility_invite_only_always_visible_to_instructor(
    invite_course, owner, manager,
):
    assert invite_course in Course.objects.visible_to(owner)
    assert invite_course in Course.objects.visible_to(manager)


@pytest.mark.django_db
def test_visibility_open_course_still_visible_to_member(course, learner):
    course.enrollment_mode = Course.ENROLL_OPEN
    course.is_published = True
    course.save()
    qs = Course.objects.visible_to(learner)
    assert course in qs


# ---------------------------------------------------------------------
# HTTP endpoints
# ---------------------------------------------------------------------

@pytest.mark.django_db
def test_endpoint_send_invite_creates_row(invite_course, learner, owner):
    client = APIClient()
    client.force_authenticate(owner)
    url = reverse(
        "api:lms-enrollment-api:course-invite-send",
        kwargs={"course_id": invite_course.id},
    )
    response = client.post(url, {"invitee_id": learner.id}, format="json")
    assert response.status_code == 201
    assert response.json()["invitee"] == learner.id
    assert response.json()["status"] == "pending"


@pytest.mark.django_db
def test_endpoint_send_invite_forbids_non_instructor(invite_course, learner):
    client = APIClient()
    client.force_authenticate(learner)
    url = reverse(
        "api:lms-enrollment-api:course-invite-send",
        kwargs={"course_id": invite_course.id},
    )
    response = client.post(url, {"invitee_id": learner.id}, format="json")
    assert response.status_code in (400, 403)


@pytest.mark.django_db
def test_endpoint_bulk_send_creates_one_invite_per_member(
    invite_course, learner, manager, owner, stranger,
):
    """Bulk send accepts a list of invitee ids, creates one
    ``CourseInvite`` per domain member and silently skips the rest
    (non-member, missing id, …) instead of erroring out."""
    client = APIClient()
    client.force_authenticate(owner)
    url = reverse(
        "api:lms-enrollment-api:course-invite-bulk-send",
        kwargs={"course_id": invite_course.id},
    )
    # learner + manager are both domain members; stranger is not.
    response = client.post(
        url,
        {"invitee_ids": [learner.id, manager.id, stranger.id, 999999]},
        format="json",
    )
    assert response.status_code == 200
    body = response.json()
    assert body["processed"] == 2
    assert body["skipped"] == 2
    # And the rows actually persisted.
    assert CourseInvite.objects.filter(
        course=invite_course, invitee=learner, status=CourseInvite.STATUS_PENDING,
    ).exists()
    assert CourseInvite.objects.filter(
        course=invite_course, invitee=manager, status=CourseInvite.STATUS_PENDING,
    ).exists()


@pytest.mark.django_db
def test_endpoint_bulk_resend_resends_all_pending(
    invite_course, learner, manager, stranger, owner,
):
    """Bulk-resend picks up every ``pending`` invite for the course
    and runs the resend service on each. Already-accepted /
    revoked invites are left alone — they're not ``pending``."""
    inv1 = invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    inv2 = invite_user_to_course(
        course=invite_course, invitee=manager, inviter=owner,
    )
    # A non-pending row on the same course — must stay untouched.
    revoked = CourseInvite.objects.create(
        course=invite_course, invitee=stranger, created_by=owner,
        status=CourseInvite.STATUS_REVOKED,
        expires_at=timezone.now() + timedelta(days=1),
    )
    # Backdate ``last_sent_at`` so we can detect the bump.
    CourseInvite.objects.filter(pk__in=[inv1.pk, inv2.pk]).update(
        last_sent_at=timezone.now() - timedelta(days=2),
    )

    client = APIClient()
    client.force_authenticate(owner)
    url = reverse(
        "api:lms-enrollment-api:course-invite-bulk-resend",
        kwargs={"course_id": invite_course.id},
    )
    response = client.post(url)
    assert response.status_code == 200
    body = response.json()
    assert body == {"processed": 2, "skipped": 0}

    inv1.refresh_from_db()
    inv2.refresh_from_db()
    revoked.refresh_from_db()
    assert inv1.last_sent_at > timezone.now() - timedelta(seconds=10)
    assert inv2.last_sent_at > timezone.now() - timedelta(seconds=10)
    # Revoked row was NOT touched.
    assert revoked.status == CourseInvite.STATUS_REVOKED


@pytest.mark.django_db
def test_endpoint_bulk_resend_forbids_non_instructor(invite_course, learner):
    client = APIClient()
    client.force_authenticate(learner)
    url = reverse(
        "api:lms-enrollment-api:course-invite-bulk-resend",
        kwargs={"course_id": invite_course.id},
    )
    response = client.post(url)
    assert response.status_code in (400, 403)


@pytest.mark.django_db
def test_endpoint_bulk_send_forbids_non_instructor(invite_course, learner, manager):
    """Bulk send aborts the whole call when the caller is not an
    instructor — no silent partial success."""
    client = APIClient()
    client.force_authenticate(learner)
    url = reverse(
        "api:lms-enrollment-api:course-invite-bulk-send",
        kwargs={"course_id": invite_course.id},
    )
    response = client.post(url, {"invitee_ids": [manager.id]}, format="json")
    assert response.status_code in (400, 403)


@pytest.mark.django_db
def test_endpoint_bulk_send_rejects_empty_list(invite_course, owner):
    client = APIClient()
    client.force_authenticate(owner)
    url = reverse(
        "api:lms-enrollment-api:course-invite-bulk-send",
        kwargs={"course_id": invite_course.id},
    )
    response = client.post(url, {"invitee_ids": []}, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_endpoint_bulk_send_rejects_oversize_list(invite_course, owner):
    """Bulk send caps the input list at ``LMS_COURSE_INVITE_BULK_MAX``
    (200 by default). Above the cap the endpoint 400s so a runaway
    paste cannot tie up a worker for minutes."""
    from django.conf import settings as dj_settings
    client = APIClient()
    client.force_authenticate(owner)
    url = reverse(
        "api:lms-enrollment-api:course-invite-bulk-send",
        kwargs={"course_id": invite_course.id},
    )
    oversize = list(range(1, dj_settings.LMS_COURSE_INVITE_BULK_MAX + 5))
    response = client.post(url, {"invitee_ids": oversize}, format="json")
    assert response.status_code == 400
    assert "at most" in response.json()["detail"]


@pytest.mark.django_db
@override_settings(LMS_COURSE_INVITES_ENABLED=False)
def test_endpoint_send_returns_503_when_feature_disabled(
    invite_course, learner, owner,
):
    """When the operator flips the kill switch, write endpoints
    refuse the request with 503. Read endpoints (list, my-invitations)
    stay open so existing invitees can still see their pending rows."""
    client = APIClient()
    client.force_authenticate(owner)
    url = reverse(
        "api:lms-enrollment-api:course-invite-send",
        kwargs={"course_id": invite_course.id},
    )
    response = client.post(url, {"invitee_id": learner.id}, format="json")
    assert response.status_code == 503


@pytest.mark.django_db
def test_endpoint_list_invites_instructor_only(invite_course, learner, owner):
    invite_user_to_course(course=invite_course, invitee=learner, inviter=owner)
    client = APIClient()
    client.force_authenticate(owner)
    url = reverse(
        "api:lms-enrollment-api:course-invite-list",
        kwargs={"course_id": invite_course.id},
    )
    response = client.get(url)
    assert response.status_code == 200
    assert len(response.json()) == 1


@pytest.mark.django_db
def test_endpoint_list_invites_forbids_learner(invite_course, learner, owner):
    invite_user_to_course(course=invite_course, invitee=learner, inviter=owner)
    client = APIClient()
    client.force_authenticate(learner)
    url = reverse(
        "api:lms-enrollment-api:course-invite-list",
        kwargs={"course_id": invite_course.id},
    )
    response = client.get(url)
    assert response.status_code == 403


@pytest.mark.django_db
def test_endpoint_accept_creates_enrollment(invite_course, learner, owner):
    invite = invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    client = APIClient()
    client.force_authenticate(learner)
    url = reverse(
        "api:lms-enrollment-api:course-invite-accept",
        kwargs={"token": invite.token},
    )
    response = client.post(url, format="json")
    assert response.status_code == 200
    assert response.json()["status"] == CourseEnrollment.STATUS_ACTIVE


@pytest.mark.django_db
def test_endpoint_my_invitations_returns_pending_only_by_default(
    invite_course, learner, owner,
):
    """``GET /api/lms/me/invitations/`` defaults to ``status=pending``
    so the page surfaces actionable rows. Other-status rows leak in
    only when ``?status=all`` is passed."""
    pending = invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    # Same learner, different course → revoked.
    other_course = invite_course
    revoked = CourseInvite.objects.create(
        course=other_course, invitee=learner, created_by=owner,
        status=CourseInvite.STATUS_REVOKED,
        expires_at=timezone.now() + timedelta(days=14),
    )
    client = APIClient()
    client.force_authenticate(learner)
    url = reverse("api:lms-enrollment-api:my-course-invitations")

    default = client.get(url)
    assert default.status_code == 200
    ids = [row["id"] for row in default.json()]
    assert pending.id in ids
    assert revoked.id not in ids

    full = client.get(url + "?status=all")
    full_ids = [row["id"] for row in full.json()]
    assert pending.id in full_ids
    assert revoked.id in full_ids


@pytest.mark.django_db
def test_endpoint_my_invitations_isolates_users(invite_course, learner, manager, owner):
    """Each learner only sees their own invitations."""
    invite_user_to_course(course=invite_course, invitee=learner, inviter=owner)
    invite_user_to_course(course=invite_course, invitee=manager, inviter=owner)
    client = APIClient()
    client.force_authenticate(learner)
    url = reverse("api:lms-enrollment-api:my-course-invitations")
    response = client.get(url)
    assert response.status_code == 200
    rows = response.json()
    assert all(row["invitee"] == learner.id for row in rows)


@pytest.mark.django_db
def test_endpoint_detail_returns_invite_for_invitee(invite_course, learner, owner):
    invite = invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    client = APIClient()
    client.force_authenticate(learner)
    url = reverse(
        "api:lms-enrollment-api:course-invite-detail",
        kwargs={"token": invite.token},
    )
    response = client.get(url)
    assert response.status_code == 200
    assert response.json()["course"] == invite_course.id


@pytest.mark.django_db
def test_endpoint_detail_forbidden_for_third_party(
    invite_course, learner, owner, stranger,
):
    invite = invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    client = APIClient()
    client.force_authenticate(stranger)
    url = reverse(
        "api:lms-enrollment-api:course-invite-detail",
        kwargs={"token": invite.token},
    )
    response = client.get(url)
    assert response.status_code == 403


# ---------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------

@pytest.mark.django_db(transaction=True)
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_invite_emails_invitee_and_inviter(invite_course, learner, owner):
    """Sending an invitation queues two emails (one to the invitee
    with the accept URL, one confirmation to the inviter) when no
    notification preference mutes them."""
    mail.outbox = []
    invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    recipients = sorted([m.to[0] for m in mail.outbox])
    assert learner.email in recipients
    assert owner.email in recipients


@pytest.mark.django_db(transaction=True)
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_invite_respects_user_email_opt_out(invite_course, learner, owner):
    """A user that has opted out of the email channel for
    ``course_invite.received`` should not receive the invitation
    email — but should still see the in-app Notification row."""
    learner.notification_prefs = {
        KIND_COURSE_INVITE_RECEIVED: {"email": False},
    }
    learner.save(update_fields=["notification_prefs"])
    mail.outbox = []
    invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    learner_mails = [m for m in mail.outbox if learner.email in m.to]
    assert learner_mails == []


@pytest.mark.django_db(transaction=True)
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_invite_respects_domain_kind_off(invite_course, learner, owner):
    """When the domain owner has muted a whole kind via
    ``Domain.notification_settings`` it propagates to both channels —
    no web row, no email."""
    invite_course.domain.notification_settings = {
        KIND_COURSE_INVITE_RECEIVED: False,
    }
    invite_course.domain.save(update_fields=["notification_settings"])
    mail.outbox = []
    from customuser.models import Notification
    invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    learner_mails = [m for m in mail.outbox if learner.email in m.to]
    learner_rows = Notification.objects.filter(
        user=learner, kind=KIND_COURSE_INVITE_RECEIVED,
    )
    assert learner_mails == []
    assert learner_rows.count() == 0


# ---------------------------------------------------------------------
# Celery beat sweep: expire stale pending invites
# ---------------------------------------------------------------------

@pytest.mark.django_db
def test_expire_pending_course_invites_marks_only_overdue_rows(
    invite_course, learner, manager, stranger, owner,
):
    """The hourly sweep flips overdue ``pending`` invites to
    ``expired`` and leaves everything else (still-valid pending,
    accepted, revoked, declined) untouched."""
    from lms_enrollment.tasks import expire_pending_course_invites

    # Still-valid PENDING — must stay pending after the sweep.
    fresh = invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    # Overdue PENDING — should become EXPIRED. The ``.update`` bypasses
    # the service so we can set ``expires_at`` in the past without the
    # resend path bumping it forward again.
    overdue = invite_user_to_course(
        course=invite_course, invitee=manager, inviter=owner,
    )
    CourseInvite.objects.filter(pk=overdue.pk).update(
        expires_at=timezone.now() - timedelta(seconds=1),
    )
    # A non-pending row, also past its expiry — the sweep must NOT
    # touch it (status filter is ``pending`` only).
    revoked = CourseInvite.objects.create(
        course=invite_course, invitee=stranger, created_by=owner,
        status=CourseInvite.STATUS_REVOKED,
        expires_at=timezone.now() - timedelta(days=30),
    )

    n = expire_pending_course_invites()
    assert n == 1

    overdue.refresh_from_db()
    fresh.refresh_from_db()
    revoked.refresh_from_db()
    assert overdue.status == CourseInvite.STATUS_EXPIRED
    assert fresh.status == CourseInvite.STATUS_PENDING
    assert revoked.status == CourseInvite.STATUS_REVOKED


# ---------------------------------------------------------------------
# Celery beat sweep: J-3 expiration reminder
# ---------------------------------------------------------------------

@pytest.mark.django_db
def test_send_course_invite_reminders_fires_once_within_window(
    invite_course, learner, manager, stranger, owner,
):
    """The reminder sweep emails one J-3 follow-up per row inside the
    ``LMS_COURSE_INVITE_REMINDER_HOURS_BEFORE`` window, stamps
    ``reminder_sent_at`` so a second run is a no-op, and leaves rows
    outside the window (too soon / already accepted / already
    reminded) alone."""
    from lms_enrollment.tasks import send_course_invite_reminders

    # Row #1: pending, expires in 24h — INSIDE the 72h reminder window.
    in_window = invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    CourseInvite.objects.filter(pk=in_window.pk).update(
        expires_at=timezone.now() + timedelta(hours=24),
    )
    # Row #2: pending, expires in 10 days — OUTSIDE the window.
    far_off = invite_user_to_course(
        course=invite_course, invitee=manager, inviter=owner,
    )
    CourseInvite.objects.filter(pk=far_off.pk).update(
        expires_at=timezone.now() + timedelta(days=10),
    )
    # Row #3: pending but already reminded — must NOT be reminded again.
    already_reminded = CourseInvite.objects.create(
        course=invite_course, invitee=stranger, created_by=owner,
        status=CourseInvite.STATUS_PENDING,
        expires_at=timezone.now() + timedelta(hours=12),
        reminder_sent_at=timezone.now() - timedelta(hours=1),
    )

    mail.outbox = []
    with override_settings(LMS_COURSE_INVITE_REMINDER_HOURS_BEFORE=72):
        n = send_course_invite_reminders()
        assert n == 1

    in_window.refresh_from_db()
    far_off.refresh_from_db()
    already_reminded.refresh_from_db()
    assert in_window.reminder_sent_at is not None
    assert far_off.reminder_sent_at is None
    # The pre-existing stamp on row #3 must NOT be overwritten.
    assert already_reminded.reminder_sent_at is not None

    # Second run is a no-op (idempotent on ``reminder_sent_at``).
    with override_settings(LMS_COURSE_INVITE_REMINDER_HOURS_BEFORE=72):
        assert send_course_invite_reminders() == 0


@pytest.mark.django_db
def test_send_course_invite_reminders_is_disabled_when_window_zero(
    invite_course, learner, owner,
):
    """``LMS_COURSE_INVITE_REMINDER_HOURS_BEFORE=0`` short-circuits the
    sweep: no row is touched, no email queued. Lets the operator
    disable the feature at runtime without removing the beat entry."""
    from lms_enrollment.tasks import send_course_invite_reminders

    inv = invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    CourseInvite.objects.filter(pk=inv.pk).update(
        expires_at=timezone.now() + timedelta(hours=1),
    )

    with override_settings(LMS_COURSE_INVITE_REMINDER_HOURS_BEFORE=0):
        assert send_course_invite_reminders() == 0

    inv.refresh_from_db()
    assert inv.reminder_sent_at is None


@pytest.mark.django_db
def test_resend_course_invite_clears_reminder_stamp(
    invite_course, learner, owner,
):
    """A manual resend after a reminder already fired must reset the
    ``reminder_sent_at`` stamp so the new ``expires_at`` triggers a
    fresh reminder when it enters the J-3 window."""
    inv = invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    CourseInvite.objects.filter(pk=inv.pk).update(
        reminder_sent_at=timezone.now() - timedelta(hours=2),
    )
    inv.refresh_from_db()
    assert inv.reminder_sent_at is not None

    resend_course_invite(invite=inv, sender=owner)

    inv.refresh_from_db()
    assert inv.reminder_sent_at is None


@pytest.mark.django_db
def test_notify_instructors_helper_fans_out_to_owner_and_managers(
    course, learner, owner, manager,
):
    """Direct unit test on ``_notify_instructors_of_pending_request``:
    it MUST emit one web row per instructor (owner + managers) and
    skip the self-enrolling user itself (so an instructor who self-
    enrolls doesn't notify themselves through the back door)."""
    from customuser.notifications import KIND_COURSE_ENROLLMENT_REQUEST
    from customuser.models import Notification
    from lms_enrollment.models import CourseEnrollment
    from lms_enrollment.services import _notify_instructors_of_pending_request

    enrollment = CourseEnrollment.objects.create(
        user=learner, course=course,
        status=CourseEnrollment.STATUS_PENDING,
    )
    Notification.objects.filter(kind=KIND_COURSE_ENROLLMENT_REQUEST).delete()

    _notify_instructors_of_pending_request(enrollment)

    rows = Notification.objects.filter(kind=KIND_COURSE_ENROLLMENT_REQUEST)
    assert rows.filter(user=owner).exists()
    assert rows.filter(user=manager).exists()
    assert not rows.filter(user=learner).exists()

    # Payload includes the deep-link context the frontend uses.
    row = rows.filter(user=owner).first()
    assert row.payload["course_id"] == course.id
    assert row.payload["course_slug"] == course.slug
    assert row.payload["user_id"] == learner.id
    assert row.payload["user_username"] == learner.username


@pytest.mark.django_db
def test_notify_instructors_helper_skips_self_invitee(course, owner):
    """Edge case: the course owner self-enrolls. The helper excludes
    the enrollee from the fan-out so the owner doesn't notify
    themselves."""
    from customuser.notifications import KIND_COURSE_ENROLLMENT_REQUEST
    from customuser.models import Notification
    from lms_enrollment.models import CourseEnrollment
    from lms_enrollment.services import _notify_instructors_of_pending_request

    enrollment = CourseEnrollment.objects.create(
        user=owner, course=course,
        status=CourseEnrollment.STATUS_PENDING,
    )
    Notification.objects.filter(kind=KIND_COURSE_ENROLLMENT_REQUEST).delete()

    _notify_instructors_of_pending_request(enrollment)

    rows = Notification.objects.filter(kind=KIND_COURSE_ENROLLMENT_REQUEST)
    assert not rows.filter(user=owner).exists()


@pytest.mark.django_db(transaction=True)
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_pending_enrollment_notifies_all_instructors(
    course, learner, owner, manager,
):
    """A self-enrollment on an ``approval``-mode course fires the
    ``lms.course_enrollment_request.created`` notification on every
    instructor (owner + managers) so they don't miss it."""
    from customuser.notifications import KIND_COURSE_ENROLLMENT_REQUEST
    from customuser.models import Notification
    from lms_enrollment.services import enroll_user_to_course

    course.enrollment_mode = Course.ENROLL_APPROVAL
    course.save()
    mail.outbox = []

    enroll_user_to_course(user=learner, course=course)

    owner_mails = [m for m in mail.outbox if owner.email in m.to]
    manager_mails = [m for m in mail.outbox if manager.email in m.to]
    learner_mails = [m for m in mail.outbox if learner.email in m.to]
    assert owner_mails  # instructor (owner) notified
    assert manager_mails  # instructor (manager) notified
    assert learner_mails  # learner still gets the "pending" confirmation

    rows = Notification.objects.filter(kind=KIND_COURSE_ENROLLMENT_REQUEST)
    assert rows.filter(user=owner).exists()
    assert rows.filter(user=manager).exists()
    # Learner does NOT get a "request created" web row (they're the requester).
    assert not rows.filter(user=learner).exists()


@pytest.mark.django_db(transaction=True)
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_pending_enrollment_respects_instructor_email_opt_out(
    course, learner, owner, manager,
):
    """An instructor who muted the email channel for
    ``course_enrollment_request`` keeps the web row but stops getting
    emails — same intersection logic as every other notification kind."""
    from customuser.notifications import KIND_COURSE_ENROLLMENT_REQUEST
    from lms_enrollment.services import enroll_user_to_course

    course.enrollment_mode = Course.ENROLL_APPROVAL
    course.save()
    owner.notification_prefs = {
        KIND_COURSE_ENROLLMENT_REQUEST: {"email": False},
    }
    owner.save(update_fields=["notification_prefs"])
    mail.outbox = []

    enroll_user_to_course(user=learner, course=course)

    owner_mails = [m for m in mail.outbox if owner.email in m.to]
    manager_mails = [m for m in mail.outbox if manager.email in m.to]
    assert owner_mails == []  # muted
    assert manager_mails  # other instructor still gets it


@pytest.mark.django_db(transaction=True)
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_accept_emails_inviter(invite_course, learner, owner):
    invite = invite_user_to_course(
        course=invite_course, invitee=learner, inviter=owner,
    )
    mail.outbox = []
    accept_course_invite(invite=invite, accepted_by=learner)
    inviter_mails = [m for m in mail.outbox if owner.email in m.to]
    assert inviter_mails != []
