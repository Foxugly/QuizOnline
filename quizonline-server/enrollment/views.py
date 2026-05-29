from datetime import timedelta
from statistics import median

from django.conf import settings
from django.core.exceptions import (
    PermissionDenied as DjangoPermissionDenied,
    ValidationError as DjangoValidationError,
)
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from course.models import Course
from course.permissions import is_lms_instructor
from course.services import record_course_audit
from lesson.models import Lesson

from .models import (
    CourseEnrollment,
    CourseInvite,
    CourseProgress,
    LessonNote,
)
from .permissions import IsEnrollmentOwnerOrInstructor
from .serializers import (
    CourseEnrollmentSerializer,
    CourseInviteSendSerializer,
    CourseInviteSerializer,
    CourseProgressSerializer,
    LessonNoteSerializer,
    LessonProgressSerializer,
)
from .services import (
    accept_course_invite,
    approve_enrollment,
    decline_course_invite,
    enroll_user_to_course,
    invite_user_to_course,
    mark_lesson_completed,
    mark_lesson_started,
    reject_enrollment,
    resend_course_invite,
    revoke_course_invite,
)


class CourseEnrollmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CourseEnrollment.objects.none()
    serializer_class = CourseEnrollmentSerializer
    permission_classes = [IsEnrollmentOwnerOrInstructor]

    def get_queryset(self):
        user = self.request.user
        course_filter = self.request.query_params.get("course")
        status_filter = self.request.query_params.get("status")

        base = CourseEnrollment.objects.select_related("user", "course")

        if course_filter:
            try:
                course_id = int(course_filter)
            except (TypeError, ValueError):
                return base.none()
            # Instructor of that course → see all its enrollments.
            from course.models import Course
            from course.permissions import is_lms_instructor
            course = Course.objects.filter(pk=course_id).first()
            if course and is_lms_instructor(user, course):
                qs = base.filter(course=course)
            else:
                # Otherwise: only the user's own enrollments scoped to that course.
                qs = base.filter(user=user, course_id=course_id)
        elif user.is_superuser:
            qs = base.all()
        else:
            qs = base.filter(user=user)

        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs.order_by("-enrolled_at", "-id")

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        enrollment = self.get_object()
        enrollment.status = CourseEnrollment.STATUS_CANCELLED
        enrollment.save(update_fields=["status"])
        return Response(CourseEnrollmentSerializer(enrollment).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        enrollment = self.get_object()
        approve_enrollment(enrollment=enrollment, decided_by=request.user)
        return Response(CourseEnrollmentSerializer(enrollment).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        enrollment = self.get_object()
        reject_enrollment(
            enrollment=enrollment,
            decided_by=request.user,
            reason=request.data.get("reason", ""),
        )
        return Response(CourseEnrollmentSerializer(enrollment).data)


class _LmsEnrollThrottle(ScopedRateThrottle):
    """Learner-side bucket: self-enroll + accept invite. Tightly
    capped (20/min) so a script attempting to brute-force course IDs
    gets rate-limited fast."""

    scope = "lms_enroll"


class _LmsInviteSendThrottle(ScopedRateThrottle):
    """Instructor-side bucket: send / bulk-send / resend invitations.
    Higher cap (50/min) because an instructor inviting a cohort
    legitimately needs more throughput than a learner self-enroll.
    Split from ``lms_enroll`` so a bulk-invite spree by one
    instructor cannot starve the learner-side accept flow that
    shares the same scope."""

    scope = "lms_invite_send"


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([_LmsEnrollThrottle])
def enroll_to_course(request, course_id: int):
    course = Course.objects.filter(pk=course_id).first()
    if not course:
        return Response(status=status.HTTP_404_NOT_FOUND)
    enrollment = enroll_user_to_course(user=request.user, course=course)
    return Response(
        CourseEnrollmentSerializer(enrollment).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_lesson(request, lesson_id: int):
    lesson = Lesson.objects.filter(pk=lesson_id).first()
    if not lesson:
        return Response(status=status.HTTP_404_NOT_FOUND)
    p = mark_lesson_started(user=request.user, lesson=lesson)
    return Response(LessonProgressSerializer(p).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def complete_lesson(request, lesson_id: int):
    lesson = Lesson.objects.filter(pk=lesson_id).first()
    if not lesson:
        return Response(status=status.HTTP_404_NOT_FOUND)
    percent = int(request.data.get("progress_percent", 100))
    p = mark_lesson_completed(user=request.user, lesson=lesson, progress_percent=percent)
    return Response(LessonProgressSerializer(p).data)


class CourseProgressViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CourseProgress.objects.none()
    serializer_class = CourseProgressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CourseProgress.objects.filter(user=self.request.user).select_related("course")


class _LmsAnalyticsThrottle(ScopedRateThrottle):
    scope = "lms_analytics"


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@throttle_classes([_LmsAnalyticsThrottle])
def course_analytics(request, course_id: int):
    """Aggregated analytics for a course's instructor dashboard.

    Returns a single, pre-aggregated payload so the frontend "Analytics"
    tab can render KPIs and a small trend chart without doing math in
    Angular. Restricted to instructors of the course (superuser /
    Domain owner / Domain manager) — non-instructors get a 403.

    Payload shape::

        {
          "enrollment_counts": {
            "total": int, "active": int, "pending": int,
            "completed": int, "cancelled": int,
          },
          "completion_rate_pct": int,    # completed / (active + completed)
          "last_enrolled_at": str | null,
          "last_completed_at": str | null,
          "median_progress_pct": int,    # median CourseProgress.progress_percent
                                         # across non-cancelled enrollments;
                                         # 0 when nobody has progress yet
          "certificates_issued": int,    # certificates with revoked_at IS NULL
          "enrollment_trend_30d": [
            {"date": "YYYY-MM-DD", "count": int},  # one entry per day, 30 entries
          ],
        }
    """
    course = Course.objects.filter(pk=course_id).first()
    if not course:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if not is_lms_instructor(request.user, course):
        raise PermissionDenied()

    enrollments = CourseEnrollment.objects.filter(course=course)
    status_counts = dict(
        enrollments.values_list("status").annotate(n=Count("id"))
    )
    total = sum(status_counts.values())
    active = status_counts.get(CourseEnrollment.STATUS_ACTIVE, 0)
    pending = status_counts.get(CourseEnrollment.STATUS_PENDING, 0)
    completed = status_counts.get(CourseEnrollment.STATUS_COMPLETED, 0)
    cancelled = status_counts.get(CourseEnrollment.STATUS_CANCELLED, 0)
    denom = active + completed
    completion_rate_pct = round((completed / denom) * 100) if denom > 0 else 0

    last_enrolled = enrollments.order_by("-enrolled_at").values_list(
        "enrolled_at", flat=True
    ).first()
    last_completed = (
        enrollments.exclude(completed_at__isnull=True)
        .order_by("-completed_at")
        .values_list("completed_at", flat=True)
        .first()
    )

    # Median progress across enrollees who have engaged at all (any
    # CourseProgress row with non-zero progress). Excluded users with
    # cancelled enrollments — they distort the metric downward without
    # reflecting real learner behaviour.
    active_user_ids = list(
        enrollments.exclude(status=CourseEnrollment.STATUS_CANCELLED)
        .values_list("user_id", flat=True)
    )
    progress_values = list(
        CourseProgress.objects.filter(
            course=course, user_id__in=active_user_ids
        ).values_list("progress_percent", flat=True)
    )
    median_progress_pct = int(median(progress_values)) if progress_values else 0

    from certificate.models import Certificate
    certificates_issued = Certificate.objects.filter(
        course=course, revoked_at__isnull=True
    ).count()

    # 30-day enrollment trend (one bucket per day, including zeros).
    today = timezone.localdate()
    earliest = today - timedelta(days=29)
    trend_rows = dict(
        enrollments.filter(enrolled_at__date__gte=earliest)
        .annotate(day=TruncDate("enrolled_at"))
        .values_list("day")
        .annotate(n=Count("id"))
    )
    enrollment_trend_30d = []
    for i in range(30):
        day = earliest + timedelta(days=i)
        enrollment_trend_30d.append(
            {"date": day.isoformat(), "count": trend_rows.get(day, 0)}
        )

    invite_block = _course_invite_analytics_block(course, today, earliest)

    return Response({
        "enrollment_counts": {
            "total": total,
            "active": active,
            "pending": pending,
            "completed": completed,
            "cancelled": cancelled,
        },
        "completion_rate_pct": completion_rate_pct,
        "last_enrolled_at": last_enrolled.isoformat() if last_enrolled else None,
        "last_completed_at": last_completed.isoformat() if last_completed else None,
        "median_progress_pct": median_progress_pct,
        "certificates_issued": certificates_issued,
        "enrollment_trend_30d": enrollment_trend_30d,
        **invite_block,
    })


def _course_invite_analytics_block(course, today, earliest):
    """Return the ``invite_*`` analytics keys for a course's
    invite-mode dashboard. Always shaped the same way (zeros when
    the course never used invitations) so the frontend doesn't need
    to branch on schema presence.

    Metrics:

    * ``invite_counts`` — one count per status (pending / accepted /
      declined / revoked / expired) plus a total.
    * ``invite_acceptance_rate_pct`` — accepted / (accepted +
      declined + expired + revoked). ``pending`` rows are excluded
      so the rate reflects only invitations that have reached a
      terminal state.
    * ``invite_median_decision_hours`` — median hours between
      ``last_sent_at`` and the decision timestamp on every
      accepted / declined invite. Zero when nobody decided yet.
    * ``invite_trend_30d`` — one bucket per day for the last 30
      days counting invitations created in that bucket. Same shape
      as ``enrollment_trend_30d``.
    """
    invites = CourseInvite.objects.filter(course=course)
    status_counts = dict(
        invites.values_list("status").annotate(n=Count("id"))
    )
    pending = status_counts.get(CourseInvite.STATUS_PENDING, 0)
    accepted = status_counts.get(CourseInvite.STATUS_ACCEPTED, 0)
    declined = status_counts.get(CourseInvite.STATUS_DECLINED, 0)
    revoked = status_counts.get(CourseInvite.STATUS_REVOKED, 0)
    expired = status_counts.get(CourseInvite.STATUS_EXPIRED, 0)
    total = pending + accepted + declined + revoked + expired

    terminal = accepted + declined + revoked + expired
    invite_acceptance_rate_pct = (
        round((accepted / terminal) * 100) if terminal > 0 else 0
    )

    # Median decision latency: how long between ``last_sent_at`` and
    # the moment the invitee acted (accept or decline). Revoked /
    # expired rows are excluded — they don't reflect invitee
    # behaviour.
    decision_rows = (
        invites.filter(
            status__in=[
                CourseInvite.STATUS_ACCEPTED, CourseInvite.STATUS_DECLINED,
            ],
        )
        .values("last_sent_at", "accepted_at", "declined_at")
    )
    decision_hours = []
    for r in decision_rows:
        decided = r["accepted_at"] or r["declined_at"]
        if decided and r["last_sent_at"]:
            delta = decided - r["last_sent_at"]
            decision_hours.append(delta.total_seconds() / 3600.0)
    invite_median_decision_hours = (
        round(median(decision_hours), 1) if decision_hours else 0
    )

    # 30-day creation trend.
    invite_trend_rows = dict(
        invites.filter(created_at__date__gte=earliest)
        .annotate(day=TruncDate("created_at"))
        .values_list("day")
        .annotate(n=Count("id"))
    )
    invite_trend_30d = []
    for i in range(30):
        day = earliest + timedelta(days=i)
        invite_trend_30d.append(
            {"date": day.isoformat(), "count": invite_trend_rows.get(day, 0)}
        )

    return {
        "invite_counts": {
            "total": total,
            "pending": pending,
            "accepted": accepted,
            "declined": declined,
            "revoked": revoked,
            "expired": expired,
        },
        "invite_acceptance_rate_pct": invite_acceptance_rate_pct,
        "invite_median_decision_hours": invite_median_decision_hours,
        "invite_trend_30d": invite_trend_30d,
    }


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def my_lesson_note(request, lesson_id: int):
    """Read or upsert the calling user's private note for one lesson.

    GET returns the note's content (empty string when none exists yet
    — no need for a 404 on a "fresh" lesson). PUT body is
    ``{"content": str}`` and creates the row on first write,
    overwrites it on subsequent writes. We never list notes across
    users: notes are strictly private.
    """
    lesson = Lesson.objects.filter(pk=lesson_id).first()
    if not lesson:
        return Response(status=status.HTTP_404_NOT_FOUND)
    note, _ = LessonNote.objects.get_or_create(user=request.user, lesson=lesson)
    if request.method == "PUT":
        content = request.data.get("content", "")
        if not isinstance(content, str):
            return Response(
                {"detail": "content must be a string."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        note.content = content
        note.save(update_fields=["content", "updated_at"])
    return Response(LessonNoteSerializer(note).data)


# ---------------------------------------------------------------------
# Course invitations
# ---------------------------------------------------------------------

def _get_user_or_404(user_id):
    from django.contrib.auth import get_user_model
    return get_user_model().objects.filter(pk=user_id).first()


def _require_invites_enabled():
    """Raise a 503-shaped response payload if the operator has muted
    the course-invite feature via ``LMS_COURSE_INVITES_ENABLED``. Used
    by every invite endpoint so the kill switch is a single point of
    control."""
    if not getattr(settings, "LMS_COURSE_INVITES_ENABLED", True):
        return Response(
            {"detail": "Course invitations are temporarily disabled."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return None


@extend_schema(
    request=CourseInviteSendSerializer,
    responses={status.HTTP_201_CREATED: CourseInviteSerializer},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([_LmsInviteSendThrottle])
def course_invite_send(request, course_id: int):
    """Instructor invites a domain member to an ``ENROLL_INVITE`` course."""
    gate = _require_invites_enabled()
    if gate is not None:
        return gate
    course = Course.objects.filter(pk=course_id).first()
    if not course:
        return Response(status=status.HTTP_404_NOT_FOUND)

    payload = CourseInviteSendSerializer(data=request.data)
    payload.is_valid(raise_exception=True)
    invitee = _get_user_or_404(payload.validated_data["invitee_id"])
    if invitee is None:
        return Response(
            {"detail": "Invitee not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    invite = invite_user_to_course(
        course=course, invitee=invitee, inviter=request.user,
    )
    return Response(
        CourseInviteSerializer(invite).data,
        status=status.HTTP_201_CREATED,
    )


@extend_schema(
    responses={
        status.HTTP_200_OK: {
            "type": "object",
            "properties": {
                "processed": {"type": "integer"},
                "skipped": {"type": "integer"},
            },
            "required": ["processed", "skipped"],
        },
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([_LmsInviteSendThrottle])
def course_invite_bulk_send(request, course_id: int):
    """Instructor sends invitations to several domain members in one go.

    Body: ``{"invitee_ids": [int, ...]}``. The endpoint short-circuits
    on the first permission failure (non-instructor / wrong course mode
    / domain mismatch) so a bad caller can't squeeze through one
    successful invite. Per-invitee failures (already enrolled, etc.)
    are silently counted as ``skipped`` so the bulk-send doesn't get
    derailed by stale picker rows.

    Counts the whole call as ONE hit against the ``lms_enroll``
    throttle bucket, so an instructor inviting 50 learners at once
    doesn't trip the per-minute limit they would hit if they looped
    client-side.

    Caps the request at ``settings.LMS_COURSE_INVITE_BULK_MAX`` ids
    (default 200) so a runaway paste cannot tie up a worker for
    minutes — the cap is large enough to cover a "whole cohort"
    invite in a single shot for any realistic course.
    """
    gate = _require_invites_enabled()
    if gate is not None:
        return gate
    course = Course.objects.filter(pk=course_id).first()
    if not course:
        return Response(status=status.HTTP_404_NOT_FOUND)

    raw_ids = request.data.get("invitee_ids", [])
    if not isinstance(raw_ids, list) or not raw_ids:
        return Response(
            {"detail": "invitee_ids must be a non-empty list of integers."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    bulk_max = getattr(settings, "LMS_COURSE_INVITE_BULK_MAX", 200)
    if len(raw_ids) > bulk_max:
        return Response(
            {
                "detail": (
                    f"invitee_ids must contain at most {bulk_max} entries "
                    f"(received {len(raw_ids)})."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        invitee_ids = [int(i) for i in raw_ids]
    except (TypeError, ValueError):
        return Response(
            {"detail": "invitee_ids must contain integers only."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from django.contrib.auth import get_user_model
    User = get_user_model()
    invitees = {u.id: u for u in User.objects.filter(pk__in=invitee_ids)}

    processed = 0
    skipped = 0
    for uid in invitee_ids:
        invitee = invitees.get(uid)
        if invitee is None:
            skipped += 1
            continue
        try:
            invite_user_to_course(
                course=course, invitee=invitee, inviter=request.user,
            )
            processed += 1
        except DjangoPermissionDenied:
            # Caller is not an instructor — abort the whole call so
            # an unprivileged user can't drip-feed invites one by one.
            raise PermissionDenied()
        except DjangoValidationError:
            # Per-invitee rule violation (already enrolled, non-member,
            # wrong mode). Skip and continue with the next id.
            skipped += 1
    return Response({"processed": processed, "skipped": skipped})


@extend_schema(responses={status.HTTP_200_OK: CourseInviteSerializer(many=True)})
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def course_invite_list(request, course_id: int):
    """List invitations for a course. Instructor-only."""
    course = Course.objects.filter(pk=course_id).first()
    if not course:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if not is_lms_instructor(request.user, course):
        raise PermissionDenied()

    status_filter = request.query_params.get("status")
    qs = (
        CourseInvite.objects.filter(course=course)
        .select_related("course", "invitee", "created_by")
        .order_by("-created_at")
    )
    if status_filter:
        qs = qs.filter(status=status_filter)
    return Response(CourseInviteSerializer(qs, many=True).data)


@extend_schema(
    responses={
        status.HTTP_200_OK: {
            "type": "object",
            "properties": {
                "processed": {"type": "integer"},
                "skipped": {"type": "integer"},
            },
            "required": ["processed", "skipped"],
        },
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([_LmsInviteSendThrottle])
def course_invite_bulk_resend(request, course_id: int):
    """Resend every pending invitation on a course in one shot.

    The instructor companion to ``course_invite_bulk_send``: when a
    course already has a dozen pending invites and the cohort start
    date slips, nobody wants to click "Resend" twelve times. This
    endpoint pulls every ``CourseInvite`` in ``STATUS_PENDING`` for
    the course, runs :func:`resend_course_invite` on each, and
    reports a ``{processed, skipped}`` count.

    ``skipped`` covers the narrow race window where a row flips out
    of ``pending`` between the queryset and the per-row call
    (someone accepting / declining / the expire sweep landing
    simultaneously). Returns the bulk shape the catalog already
    consumes for ``bulk_send`` so the same toast and refresh path
    apply on the frontend side.

    Counts the whole call as ONE hit against the ``lms_invite_send``
    throttle bucket — same rationale as bulk_send.
    """
    gate = _require_invites_enabled()
    if gate is not None:
        return gate
    course = Course.objects.filter(pk=course_id).first()
    if not course:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if not is_lms_instructor(request.user, course):
        raise PermissionDenied()

    pending = (
        CourseInvite.objects
        .select_related("course", "invitee", "created_by")
        .filter(course=course, status=CourseInvite.STATUS_PENDING)
    )
    processed = 0
    skipped = 0
    for invite in pending:
        try:
            resend_course_invite(invite=invite, sender=request.user)
            processed += 1
        except DjangoValidationError:
            # Row raced out of ``pending`` between fetch and resend.
            skipped += 1
    # One bulk row in the audit trail rather than N — matches the
    # bulk_send semantics (one user-visible action = one log row) and
    # keeps the audit-log tab readable on courses with large cohorts.
    if processed or skipped:
        record_course_audit(
            course=course, actor=request.user,
            action="course.invite.bulk_resend",
            metadata={"processed": processed, "skipped": skipped},
        )
    return Response({"processed": processed, "skipped": skipped})


@extend_schema(responses={status.HTTP_200_OK: CourseInviteSerializer})
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([_LmsInviteSendThrottle])
def course_invite_resend(request, pk: int):
    """Instructor re-sends a pending invitation."""
    gate = _require_invites_enabled()
    if gate is not None:
        return gate
    invite = (
        CourseInvite.objects
        .select_related("course", "invitee", "created_by")
        .filter(pk=pk)
        .first()
    )
    if not invite:
        return Response(status=status.HTTP_404_NOT_FOUND)
    invite = resend_course_invite(invite=invite, sender=request.user)
    return Response(CourseInviteSerializer(invite).data)


@extend_schema(responses={status.HTTP_200_OK: CourseInviteSerializer})
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def course_invite_revoke(request, pk: int):
    """Instructor revokes a pending invitation."""
    invite = (
        CourseInvite.objects
        .select_related("course", "invitee", "created_by")
        .filter(pk=pk)
        .first()
    )
    if not invite:
        return Response(status=status.HTTP_404_NOT_FOUND)
    invite = revoke_course_invite(invite=invite, revoked_by=request.user)
    return Response(CourseInviteSerializer(invite).data)


@extend_schema(responses={status.HTTP_200_OK: CourseInviteSerializer(many=True)})
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_course_invitations(request):
    """Every ``CourseInvite`` row addressed to the calling user,
    most recent first. Powers the ``/me/invitations`` page so a
    learner with several pending invitations can find them all in
    one place without trawling through email.

    Defaults to ``status=pending`` so the page surfaces actionable
    rows first; pass ``?status=all`` to include accepted / declined /
    revoked / expired rows for a basic history view."""
    qs = (
        CourseInvite.objects.filter(invitee=request.user)
        .select_related("course", "created_by", "course__domain")
        .order_by("-created_at")
    )
    status_filter = request.query_params.get("status")
    if status_filter and status_filter != "all":
        qs = qs.filter(status=status_filter)
    elif not status_filter:
        qs = qs.filter(status=CourseInvite.STATUS_PENDING)
    return Response(CourseInviteSerializer(qs, many=True).data)


@extend_schema(responses={status.HTTP_200_OK: CourseInviteSerializer})
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def course_invite_detail(request, token: str):
    """Token-keyed lookup. Returns the invitation (any status) for the
    invitee or any instructor of the course — used by the
    ``/course-invite/{token}/`` acceptance page to render the
    invitation card before the user clicks Accept or Decline."""
    invite = (
        CourseInvite.objects
        .select_related("course", "invitee", "created_by", "course__domain")
        .filter(token=token)
        .first()
    )
    if not invite:
        return Response(status=status.HTTP_404_NOT_FOUND)
    user = request.user
    if user.id != invite.invitee_id and not is_lms_instructor(user, invite.course):
        raise PermissionDenied()
    return Response(CourseInviteSerializer(invite).data)


@extend_schema(responses={status.HTTP_200_OK: CourseEnrollmentSerializer})
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([_LmsEnrollThrottle])
def course_invite_accept(request, token: str):
    """Invitee accepts a pending invitation. Creates the active
    ``CourseEnrollment`` and notifies the inviter."""
    gate = _require_invites_enabled()
    if gate is not None:
        return gate
    invite = (
        CourseInvite.objects.select_related("course", "invitee", "created_by")
        .filter(token=token)
        .first()
    )
    if not invite:
        return Response(status=status.HTTP_404_NOT_FOUND)
    enrollment = accept_course_invite(invite=invite, accepted_by=request.user)
    return Response(
        CourseEnrollmentSerializer(enrollment).data,
        status=status.HTTP_200_OK,
    )


@extend_schema(responses={status.HTTP_200_OK: CourseInviteSerializer})
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def course_invite_decline(request, token: str):
    """Invitee declines a pending invitation."""
    gate = _require_invites_enabled()
    if gate is not None:
        return gate
    invite = (
        CourseInvite.objects.select_related("course", "invitee", "created_by")
        .filter(token=token)
        .first()
    )
    if not invite:
        return Response(status=status.HTTP_404_NOT_FOUND)
    invite = decline_course_invite(invite=invite, declined_by=request.user)
    return Response(CourseInviteSerializer(invite).data)
