from datetime import timedelta
from statistics import median

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.http import FileResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle

from lms_catalog.models import Course, Lesson
from lms_catalog.permissions import is_lms_instructor

from .models import Certificate, CourseEnrollment, CourseProgress, LessonNote
from .permissions import IsEnrollmentOwnerOrInstructor
from .serializers import (
    CertificateSerializer,
    CertificateVerifySerializer,
    CourseEnrollmentSerializer,
    CourseProgressSerializer,
    LessonNoteSerializer,
    LessonProgressSerializer,
)
from .services import (
    approve_enrollment,
    enroll_user_to_course,
    mark_lesson_completed,
    mark_lesson_started,
    reject_enrollment,
)


class CourseEnrollmentViewSet(viewsets.ReadOnlyModelViewSet):
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
            from lms_catalog.models import Course
            from lms_catalog.permissions import is_lms_instructor
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
    scope = "lms_enroll"


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
    serializer_class = CourseProgressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CourseProgress.objects.filter(user=self.request.user).select_related("course")


class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Certificate.objects.filter(user=self.request.user).select_related("course")

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        cert = self.get_object()
        if not cert.pdf:
            return Response({"detail": "PDF not ready yet."}, status=status.HTTP_202_ACCEPTED)
        return FileResponse(
            cert.pdf.open("rb"),
            as_attachment=True,
            filename=f"{cert.certificate_number}.pdf",
        )

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        cert = self.get_object()
        cert.revoked_at = timezone.now()
        cert.revoke_reason = request.data.get("reason", "")
        cert.save(update_fields=["revoked_at", "revoke_reason"])
        return Response(CertificateSerializer(cert).data)


class _LmsVerifyThrottle(AnonRateThrottle):
    scope = "lms_cert_verify"


@api_view(["GET"])
@permission_classes([IsAuthenticated])
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
    })


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


@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([_LmsVerifyThrottle])
def verify_certificate(request, token: str):
    cert = (
        Certificate.objects
        .filter(verification_token=token)
        .select_related("user", "course")
        .first()
    )
    if not cert:
        return Response({"valid": False}, status=status.HTTP_404_NOT_FOUND)
    course_title = (
        cert.course.safe_translation_getter("title", any_language=True) or cert.course.slug
    )
    payload = {
        "valid": cert.revoked_at is None,
        "certificate_number": cert.certificate_number,
        "course_title": course_title,
        "user_display_name": cert.user.get_display_name(),
        "issued_at": cert.issued_at,
        "revoked": cert.revoked_at is not None,
    }
    return Response(CertificateVerifySerializer(payload).data)
