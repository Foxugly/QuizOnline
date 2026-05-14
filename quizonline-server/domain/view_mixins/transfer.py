"""
Transfer-ownership slice of ``DomainViewSet``.

One endpoint: ``POST /api/domain/{id}/transfer/`` initiates an
ownership transfer to the user identified by ``user_id``. The flow is
two-step — this endpoint queues a signed email; the actual ownership
change happens once the future owner clicks the link and confirms via
``DomainTransferAcceptView``.

Owner-only (not even managers can start a transfer). Audited.
"""
from django.contrib.auth import get_user_model
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from config.tools import ErrorDetailSerializer
from core.mailers.domain_transfer import send_domain_transfer_email
from domain.serializers import DomainTransferRequestSerializer
from domain.services import record_audit

from ._helpers import client_ip


class DomainTransferActionsMixin:
    """Adds the ``transfer`` endpoint to ``DomainViewSet``."""

    @extend_schema(
        tags=["Domain"],
        summary="Initier un transfert de propriété",
        description=(
            "Le propriétaire envoie une proposition de transfert au futur "
            "propriétaire désigné par ``user_id``. Un e-mail signé est "
            "envoyé : tant que le destinataire n'a pas cliqué le lien et "
            "confirmé, la propriété ne change pas.\n\n"
            "Refusé si l'appelant n'est pas le propriétaire actuel, ou si "
            "la cible est elle-même déjà le propriétaire."
        ),
        request=DomainTransferRequestSerializer,
        responses={
            status.HTTP_202_ACCEPTED: OpenApiResponse(description="Transfer email queued."),
            status.HTTP_403_FORBIDDEN: ErrorDetailSerializer,
            status.HTTP_404_NOT_FOUND: ErrorDetailSerializer,
        },
    )
    @action(detail=True, methods=["post"], url_path="transfer")
    def transfer(self, request, *args, **kwargs):
        domain = self.get_object()
        # Owner-only: even managers cannot start a transfer. This is a
        # higher-trust action than role changes (which we also gated to
        # owner-only in Phase A).
        is_superuser = bool(getattr(request.user, "is_superuser", False))
        if not is_superuser and domain.owner_id != request.user.id:
            return Response(
                {"detail": "owner_only"},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = DomainTransferRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        future_owner_id = serializer.validated_data["user_id"]

        User = get_user_model()
        future_owner = User.objects.filter(pk=future_owner_id).first()
        if not future_owner or not future_owner.email:
            return Response(
                {"detail": "future_owner_unreachable"},
                status=status.HTTP_404_NOT_FOUND,
            )
        if future_owner.id == domain.owner_id:
            return Response(
                {"detail": "already_owner"},
                status=status.HTTP_409_CONFLICT,
            )

        send_domain_transfer_email(
            domain=domain, initiator=request.user, future_owner=future_owner,
        )
        record_audit(
            domain=domain,
            action="transfer.initiate",
            actor=request.user,
            target_user=future_owner,
            metadata={"remote_addr": client_ip(request)},
        )
        return Response(status=status.HTTP_202_ACCEPTED)
