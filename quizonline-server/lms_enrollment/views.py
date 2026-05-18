from django.http import FileResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle

from lms_catalog.models import Course, Lesson

from .models import Certificate, CourseEnrollment, CourseProgress
from .permissions import IsEnrollmentOwnerOrInstructor
from .serializers import (
    CertificateSerializer,
    CertificateVerifySerializer,
    CourseEnrollmentSerializer,
    CourseProgressSerializer,
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
        if user.is_superuser:
            return CourseEnrollment.objects.all().select_related("user", "course")
        return CourseEnrollment.objects.filter(user=user).select_related("course")

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
