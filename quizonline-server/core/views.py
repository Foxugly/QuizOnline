from django.conf import settings
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from config.tools import ErrorDetailSerializer
from core.models import OutboundEmail
from core.serializers import TestEmailRequestSerializer, TestEmailResponseSerializer
from core.mailers._common import send_plaintext_email


@extend_schema_view(
    post=extend_schema(
        tags=["Mail"],
        summary="Envoyer un email de test",
        description=(
            "Enfile un email texte brut dans l'outbox applicative puis "
            "declenche la livraison via le flux email standard."
        ),
        request=TestEmailRequestSerializer,
        responses={
            201: TestEmailResponseSerializer,
            400: OpenApiResponse(response=ErrorDetailSerializer, description="Validation error"),
            401: OpenApiResponse(response=ErrorDetailSerializer, description="Unauthorized"),
            403: OpenApiResponse(response=ErrorDetailSerializer, description="Forbidden (admin only)"),
        },
    )
)
class TestEmailView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = TestEmailRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        to = serializer.validated_data["to"]
        subject = serializer.validated_data.get("subject") or f"{settings.NAME_APP} - email de test"
        body = serializer.validated_data.get("body") or (
            f"Ceci est un email de test envoye depuis {settings.NAME_APP}.\n\n"
            f"Declenche par: {request.user.username}\n"
            f"Date: {timezone.localtime().strftime('%Y-%m-%d %H:%M:%S %Z')}\n"
        )

        existing_ids = set(
            OutboundEmail.objects.filter(
                recipients=[to],
                subject=subject,
                body=body,
            ).values_list("id", flat=True)
        )
        send_plaintext_email(subject, body, [to])
        outbound = (
            OutboundEmail.objects
            .exclude(id__in=existing_ids)
            .filter(recipients=[to], subject=subject, body=body)
            .order_by("-id")
            .first()
        )

        response_data = {
            "detail": "Email de test enfile pour envoi.",
            "email_id": outbound.id,
            "recipients": outbound.recipients,
            "subject": outbound.subject,
        }
        return Response(response_data, status=201)
