from django.http import FileResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .models import Certificate
from .serializers import CertificateSerializer, CertificateVerifySerializer


class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Certificate.objects.none()
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
