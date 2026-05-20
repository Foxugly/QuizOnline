from __future__ import annotations

import secrets

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import IntegrityError, models, transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from customuser.notifications import (
    KIND_COURSE_ENROLLMENT_REQUEST,
    KIND_COURSE_INVITE_ACCEPTED,
    KIND_COURSE_INVITE_RECEIVED,
    KIND_COURSE_INVITE_SENT,
    notify,
    notify_many,
)
from course.models import Course
from lesson.models import Lesson
from .models import (
    Certificate,
    CertificateSequence,
    CourseEnrollment,
    CourseInvite,
    CourseProgress,
    LessonProgress,
    _default_course_invite_expiry,
)
from .notifications import (
    make_course_enrollment_request_email_callable,
    make_course_invite_accepted_email_callable,
    make_course_invite_received_email_callable,
    make_course_invite_sent_email_callable,
    notify_certificate_issued_on_commit,
    notify_course_completed_on_commit,
    notify_enrollment_approved_on_commit,
    notify_enrollment_created_on_commit,
    notify_enrollment_rejected_on_commit,
)


def _is_instructor(user, course: Course) -> bool:
    if user is None:
        return False
    if getattr(user, "is_superuser", False):
        return True
    return user.can_manage_domain(course.domain)


@transaction.atomic
def enroll_user_to_course(*, user, course: Course, requested_by=None) -> CourseEnrollment:
    """
    Idempotent enrollment creation for ``(user, course)``.

    Concurrency: when the row already exists, ``select_for_update``
    locks it so the second waiter sees the same instance and returns
    idempotently. When the row does NOT yet exist, ``select_for_update``
    has nothing to lock — two parallel transactions can both observe
    ``existing is None`` under Postgres' default READ COMMITTED
    isolation and proceed to ``create()``. The DB's
    ``unique(user, course)`` constraint catches the second
    ``INSERT`` and Django surfaces it as ``IntegrityError``. We
    catch it explicitly and converge on a single row by re-reading.

    Without this guard a browser double-submit (slow network masking
    a re-issue, two tabs clicking Enroll) bubbles a 500 to the
    learner instead of the idempotent "you're already enrolled"
    behaviour the rest of the API promises.
    """
    existing = (
        CourseEnrollment.objects.select_for_update()
        .filter(user=user, course=course)
        .first()
    )
    if existing:
        return existing

    if course.enrollment_mode == Course.ENROLL_INVITE:
        if not _is_instructor(requested_by, course):
            raise PermissionDenied(_("Course is invite-only."))
        status = CourseEnrollment.STATUS_ACTIVE
    elif course.enrollment_mode == Course.ENROLL_APPROVAL:
        status = CourseEnrollment.STATUS_PENDING
    else:
        status = CourseEnrollment.STATUS_ACTIVE

    try:
        enrollment = CourseEnrollment.objects.create(
            user=user,
            course=course,
            status=status,
            created_by=requested_by or user,
        )
    except IntegrityError:
        # Race: another transaction created the row between our
        # ``first()`` and our ``create()``. Converge on its row.
        return CourseEnrollment.objects.get(user=user, course=course)

    notify_enrollment_created_on_commit(enrollment)
    if enrollment.status == CourseEnrollment.STATUS_PENDING:
        _notify_instructors_of_pending_request(enrollment)
    _ensure_course_progress(user, course)
    return enrollment


def _notify_instructors_of_pending_request(enrollment: CourseEnrollment) -> None:
    """Fan-out web + email notification to every instructor of the
    course's domain so they know a learner is waiting on approval.
    Mirrors the join-request "created" notification for domains —
    one row per instructor, gated by per-user prefs ∩ per-domain
    settings."""
    domain = enrollment.course.domain
    instructors = _course_instructors_queryset(enrollment.course).exclude(
        pk=enrollment.user_id,
    )
    payload = {
        "enrollment_id": enrollment.id,
        "course_id": enrollment.course_id,
        "course_slug": enrollment.course.slug,
        "course_title": enrollment.course.safe_translation_getter(
            "title", any_language=True,
        ) or "",
        "user_id": enrollment.user_id,
        "user_username": enrollment.user.username,
        "user_display_name": enrollment.user.get_display_name(),
    }
    notify_many(
        users=list(instructors),
        kind=KIND_COURSE_ENROLLMENT_REQUEST,
        payload_builder=payload,
        domain=domain,
        email_callable_builder=lambda instructor:
            make_course_enrollment_request_email_callable(enrollment, instructor),
    )


def _course_instructors_queryset(course: Course):
    """Owner + all managers of the course's domain. Deduplicated."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    domain = course.domain
    return User.objects.filter(
        models.Q(pk=domain.owner_id)
        | models.Q(pk__in=domain.managers.values_list("pk", flat=True)),
    ).distinct()


@transaction.atomic
def approve_enrollment(*, enrollment: CourseEnrollment, decided_by) -> CourseEnrollment:
    if not _is_instructor(decided_by, enrollment.course):
        raise PermissionDenied()
    if enrollment.status != CourseEnrollment.STATUS_PENDING:
        raise ValidationError(_("Enrollment is not pending."))
    enrollment.status = CourseEnrollment.STATUS_ACTIVE
    enrollment.updated_by = decided_by
    enrollment.save(update_fields=["status", "updated_by"])
    notify_enrollment_approved_on_commit(enrollment)
    return enrollment


@transaction.atomic
def reject_enrollment(
    *, enrollment: CourseEnrollment, decided_by, reason: str = "",
) -> CourseEnrollment:
    if not _is_instructor(decided_by, enrollment.course):
        raise PermissionDenied()
    if enrollment.status != CourseEnrollment.STATUS_PENDING:
        raise ValidationError(_("Enrollment is not pending."))
    enrollment.status = CourseEnrollment.STATUS_CANCELLED
    enrollment.updated_by = decided_by
    enrollment.save(update_fields=["status", "updated_by"])
    notify_enrollment_rejected_on_commit(enrollment)
    return enrollment


def _ensure_course_progress(user, course: Course) -> CourseProgress:
    total = Lesson.objects.filter(
        section__course=course,
        section__is_published=True,
        is_published=True,
    ).count()
    cp, _created = CourseProgress.objects.get_or_create(
        user=user,
        course=course,
        defaults={"total_lessons_count": total},
    )
    return cp


@transaction.atomic
def mark_lesson_started(*, user, lesson: Lesson) -> LessonProgress:
    progress, _ = LessonProgress.objects.select_for_update().get_or_create(
        user=user,
        lesson=lesson,
        defaults={"is_started": True, "started_at": timezone.now()},
    )
    if not progress.is_started:
        progress.is_started = True
        progress.started_at = timezone.now()
        progress.save(update_fields=["is_started", "started_at", "last_seen_at"])
    return progress


@transaction.atomic
def mark_lesson_completed(
    *, user, lesson: Lesson, progress_percent: int = 100,
) -> LessonProgress:
    progress, _ = LessonProgress.objects.select_for_update().get_or_create(
        user=user, lesson=lesson,
    )
    was_completed = progress.is_completed
    progress.is_started = True
    progress.is_completed = True
    progress.progress_percent = max(progress.progress_percent, progress_percent)
    progress.started_at = progress.started_at or timezone.now()
    progress.completed_at = progress.completed_at or timezone.now()
    progress.save()

    course = lesson.section.course
    cp = calculate_course_progress(user=user, course=course)

    if not was_completed and cp.progress_percent == 100:
        issue_certificate_if_eligible(user=user, course=course)
    return progress


@transaction.atomic
def calculate_course_progress(*, user, course: Course) -> CourseProgress:
    total = Lesson.objects.filter(
        section__course=course,
        section__is_published=True,
        is_published=True,
    ).count()
    completed = LessonProgress.objects.filter(
        user=user,
        lesson__section__course=course,
        lesson__section__is_published=True,
        lesson__is_published=True,
        is_completed=True,
    ).count()
    percent = int((completed / total) * 100) if total else 0
    cp, _ = CourseProgress.objects.select_for_update().get_or_create(
        user=user, course=course,
    )
    cp.total_lessons_count = total
    cp.completed_lessons_count = completed
    cp.progress_percent = percent
    cp.save()
    if percent == 100:
        CourseEnrollment.objects.filter(
            user=user,
            course=course,
            status=CourseEnrollment.STATUS_ACTIVE,
        ).update(
            status=CourseEnrollment.STATUS_COMPLETED,
            completed_at=timezone.now(),
        )
        notify_course_completed_on_commit(user=user, course=course)
    return cp


def _course_completed(user, course: Course) -> bool:
    cp = CourseProgress.objects.filter(user=user, course=course).first()
    return bool(cp and cp.progress_percent == 100)


def _final_quiz_passed(user, course: Course) -> bool:
    from lms_assessment.models import LessonQuiz
    final = LessonQuiz.objects.filter(course=course).first()
    if final is None:
        return True
    from quiz.models import Quiz
    sessions = Quiz.objects.filter(
        user=user, quiz_template=final.quiz_template, active=False,
    )
    from lms_assessment.services import compute_score_percent
    return any(
        compute_score_percent(s) >= final.required_score_percent for s in sessions
    )


def _generate_certificate_number() -> str:
    year = timezone.now().year
    with transaction.atomic():
        seq, _ = CertificateSequence.objects.select_for_update().get_or_create(year=year)
        seq.counter += 1
        seq.save()
        return f"QO-{year}-{seq.counter:04d}"


def _is_domain_member(user, course: Course) -> bool:
    if user is None or not getattr(user, "id", None):
        return False
    domain = course.domain
    if getattr(domain, "owner_id", None) == user.id:
        return True
    if domain.managers.filter(pk=user.id).exists():
        return True
    return domain.members.filter(pk=user.id).exists()


def _course_invite_payload(invite: CourseInvite) -> dict:
    """Web-notification payload shared by the three invite kinds. The
    frontend uses these keys to render the human-readable line and the
    deep-link target without re-querying the API. The inviter is
    sourced from ``AuditMixin.created_by`` — the legacy ``inviter`` FK
    was dropped as redundant."""
    course = invite.course
    return {
        "invite_id": invite.id,
        "invite_token": invite.token,
        "course_id": course.id,
        "course_slug": course.slug,
        "course_title": course.safe_translation_getter("title", any_language=True) or "",
        "invitee_id": invite.invitee_id,
        "invitee_username": invite.invitee.username,
        "inviter_id": invite.created_by_id,
        "inviter_username": invite.created_by.username if invite.created_by else "",
    }


def _sentry_tag_invite(invite: CourseInvite) -> None:
    """Best-effort: tag the current Sentry scope with the invite's
    course / invitee / inviter ids so an exception fired downstream
    surfaces in Sentry with the context already attached. No-op when
    Sentry is not initialised (tests, dev without DSN). Failures here
    must never break the calling flow — observability is best-effort."""
    try:
        import sentry_sdk
        sentry_sdk.set_tag("course_id", invite.course_id)
        sentry_sdk.set_tag("invite_id", invite.id)
        sentry_sdk.set_tag("invitee_id", invite.invitee_id)
    except Exception:  # noqa: BLE001 — observability never breaks the flow
        pass


@transaction.atomic
def invite_user_to_course(*, course: Course, invitee, inviter) -> CourseInvite:
    """
    Create — or refresh — a ``CourseInvite`` so ``invitee`` can join
    the invite-only ``course``.

    Permission: ``inviter`` must be an instructor of the course's
    domain. ``invitee`` must already be a member of that same domain
    (course invitations are intra-domain only by design — instructors
    cannot pull in external users through this path).

    Idempotent: if a PENDING row already exists for ``(course,
    invitee)`` we re-use it and bump ``last_sent_at`` so clicking
    "Invite" twice does not duplicate. If the invitee already has an
    active enrollment, raise ``ValidationError`` — there is nothing
    to invite them to.
    """
    if course.enrollment_mode != Course.ENROLL_INVITE:
        raise ValidationError(_("Course is not invite-only."))
    if not _is_instructor(inviter, course):
        raise PermissionDenied(_("Only instructors can invite to this course."))
    if not _is_domain_member(invitee, course):
        raise ValidationError(_("Invitee must be a member of the course's domain."))
    if invitee.id == getattr(inviter, "id", None):
        raise ValidationError(_("You cannot invite yourself."))

    existing_enrollment = CourseEnrollment.objects.filter(
        user=invitee, course=course,
    ).first()
    if existing_enrollment and existing_enrollment.status in (
        CourseEnrollment.STATUS_ACTIVE,
        CourseEnrollment.STATUS_COMPLETED,
    ):
        raise ValidationError(_("User is already enrolled in this course."))

    invite = (
        CourseInvite.objects.select_for_update()
        .filter(course=course, invitee=invitee, status=CourseInvite.STATUS_PENDING)
        .first()
    )
    if invite is None:
        invite = CourseInvite.objects.create(
            course=course,
            invitee=invitee,
            expires_at=_default_course_invite_expiry(),
            created_by=inviter,
        )
    else:
        invite.last_sent_at = timezone.now()
        # Push the expiry forward so a resend gives the invitee a full
        # window — otherwise re-sending a 13-day-old invite leaves them
        # with one day to act, which is worse UX than not resending.
        invite.expires_at = _default_course_invite_expiry()
        invite.updated_by = inviter
        invite.save(
            update_fields=["last_sent_at", "expires_at", "updated_by", "updated_at"],
        )

    _sentry_tag_invite(invite)
    payload = _course_invite_payload(invite)
    # Notify the invitee they got an invitation.
    notify(
        user=invitee,
        kind=KIND_COURSE_INVITE_RECEIVED,
        payload=payload,
        domain=course.domain,
        email_callable=make_course_invite_received_email_callable(invite),
    )
    # Notify the inviter that the send went through (confirmation).
    if inviter is not None:
        notify(
            user=inviter,
            kind=KIND_COURSE_INVITE_SENT,
            payload=payload,
            domain=course.domain,
            email_callable=make_course_invite_sent_email_callable(invite),
        )
    return invite


def accept_course_invite(*, invite: CourseInvite, accepted_by) -> CourseEnrollment:
    """
    Mark the invitation accepted and create the matching
    ``CourseEnrollment`` in ``ACTIVE`` status.

    Permission: only the invitee themselves can accept. The invite
    must be PENDING and not expired.

    The matching enrollment is created via
    :func:`enroll_user_to_course` so the standard creation hooks
    (progress row, ``enrollment_created`` notification to the learner)
    still fire — the path stays consistent with self-enroll.

    The expiry check intentionally lives **outside** the main atomic
    block: when an expired invite is accepted we still want to mark
    it ``EXPIRED`` for audit / catalog filtering even though the
    function raises right after. A single wrapping
    ``@transaction.atomic`` would roll that mark back along with the
    raise.

    Concurrency: the status transition runs under ``select_for_update``
    on the invite row so two simultaneous accept attempts (browser
    double-click, two tabs, etc.) cannot both pass the PENDING gate
    and emit two ACCEPTED rows. The second waiter sees the now-
    accepted row and falls into the ``status != PENDING`` branch.
    """
    if accepted_by is None or accepted_by.id != invite.invitee_id:
        raise PermissionDenied(_("Only the invitee can accept this invitation."))
    if invite.status != CourseInvite.STATUS_PENDING:
        raise ValidationError(_("Invitation is not pending."))
    if invite.is_expired:
        invite.status = CourseInvite.STATUS_EXPIRED
        invite.save(update_fields=["status", "updated_at"])
        raise ValidationError(_("Invitation has expired."))

    with transaction.atomic():
        # Re-fetch under a row lock so the PENDING check is atomic
        # with the ACCEPTED write — closes the TOCTOU window between
        # the pre-check above and the save below. ``select_related``
        # carries over the FKs subsequent lines / on-commit notif
        # builders read so we don't pay a re-query per dereference.
        locked = (
            CourseInvite.objects
            .select_for_update()
            .select_related("course", "invitee", "created_by", "course__domain")
            .filter(pk=invite.pk)
            .first()
        )
        if locked is None or locked.status != CourseInvite.STATUS_PENDING:
            raise ValidationError(_("Invitation is not pending."))
        invite = locked
        _sentry_tag_invite(invite)
        invite.status = CourseInvite.STATUS_ACCEPTED
        invite.accepted_at = timezone.now()
        invite.updated_by = accepted_by
        invite.save(
            update_fields=["status", "accepted_at", "updated_by", "updated_at"],
        )

        # The invitee path bypasses the ENROLL_INVITE guard in
        # ``enroll_user_to_course`` because we mint the enrollment row
        # directly here — the invitation row is the proof of permission.
        enrollment, _created = CourseEnrollment.objects.get_or_create(
            user=invite.invitee,
            course=invite.course,
            defaults={
                "status": CourseEnrollment.STATUS_ACTIVE,
                "created_by": invite.invitee,
            },
        )
        if enrollment.status != CourseEnrollment.STATUS_ACTIVE:
            enrollment.status = CourseEnrollment.STATUS_ACTIVE
            enrollment.save(update_fields=["status"])
        _ensure_course_progress(invite.invitee, invite.course)

        payload = _course_invite_payload(invite)
        # Tell the inviter their invitation was accepted.
        if invite.created_by is not None:
            notify(
                user=invite.created_by,
                kind=KIND_COURSE_INVITE_ACCEPTED,
                payload=payload,
                domain=invite.course.domain,
                email_callable=make_course_invite_accepted_email_callable(invite),
            )
    return enrollment


@transaction.atomic
def decline_course_invite(*, invite: CourseInvite, declined_by) -> CourseInvite:
    """Mark a pending invitation declined. Only the invitee can decline."""
    if declined_by is None or declined_by.id != invite.invitee_id:
        raise PermissionDenied(_("Only the invitee can decline this invitation."))
    if invite.status != CourseInvite.STATUS_PENDING:
        raise ValidationError(_("Invitation is not pending."))
    invite.status = CourseInvite.STATUS_DECLINED
    invite.declined_at = timezone.now()
    invite.updated_by = declined_by
    invite.save(update_fields=["status", "declined_at", "updated_by", "updated_at"])
    return invite


@transaction.atomic
def revoke_course_invite(*, invite: CourseInvite, revoked_by) -> CourseInvite:
    """Revoke a pending invitation. Only instructors of the course can revoke."""
    if not _is_instructor(revoked_by, invite.course):
        raise PermissionDenied(_("Only instructors can revoke this invitation."))
    if invite.status != CourseInvite.STATUS_PENDING:
        raise ValidationError(_("Invitation is not pending."))
    invite.status = CourseInvite.STATUS_REVOKED
    invite.revoked_at = timezone.now()
    invite.updated_by = revoked_by
    invite.save(update_fields=["status", "revoked_at", "updated_by", "updated_at"])
    return invite


@transaction.atomic
def resend_course_invite(*, invite: CourseInvite, sender) -> CourseInvite:
    """Re-send a pending invitation (bumps ``last_sent_at`` and the expiry)."""
    if not _is_instructor(sender, invite.course):
        raise PermissionDenied(_("Only instructors can resend this invitation."))
    if invite.status != CourseInvite.STATUS_PENDING:
        raise ValidationError(_("Invitation is not pending."))
    invite.last_sent_at = timezone.now()
    invite.expires_at = _default_course_invite_expiry()
    # Clear the reminder stamp so the J-3 sweep re-arms for the new
    # expires_at — without this, an instructor manually re-sending an
    # invite that already triggered a reminder would never get a fresh
    # reminder against the renewed deadline.
    invite.reminder_sent_at = None
    invite.updated_by = sender
    invite.save(
        update_fields=[
            "last_sent_at", "expires_at", "reminder_sent_at",
            "updated_by", "updated_at",
        ],
    )

    payload = _course_invite_payload(invite)
    notify(
        user=invite.invitee,
        kind=KIND_COURSE_INVITE_RECEIVED,
        payload=payload,
        domain=invite.course.domain,
        email_callable=make_course_invite_received_email_callable(invite),
    )
    return invite


@transaction.atomic
def issue_certificate_if_eligible(*, user, course: Course) -> Certificate | None:
    if not _course_completed(user, course):
        return None
    if not _final_quiz_passed(user, course):
        return None
    existing = Certificate.objects.filter(
        user=user, course=course, revoked_at__isnull=True,
    ).first()
    if existing:
        return existing
    cert = Certificate.objects.create(
        user=user,
        course=course,
        certificate_number=_generate_certificate_number(),
        verification_token=secrets.token_urlsafe(32),
    )
    notify_certificate_issued_on_commit(cert)
    from .tasks import render_certificate_pdf
    transaction.on_commit(lambda: render_certificate_pdf.delay(cert.id))
    return cert
