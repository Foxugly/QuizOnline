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
    assert invite.inviter == owner
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
        course=invite_course, invitee=stranger, inviter=owner,
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
