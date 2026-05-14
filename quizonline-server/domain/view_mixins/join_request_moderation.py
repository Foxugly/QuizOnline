"""
Owner/manager moderation actions on ``DomainJoinRequestViewSet``.

Four endpoints — all gated by ``_check_can_approve`` from the host
viewset:

- ``POST /api/domain/{domain_id}/join-request/{req_id}/approve/``
- ``POST /api/domain/{domain_id}/join-request/{req_id}/reject/``
- ``POST /api/domain/{domain_id}/join-request/bulk-approve/``
- ``POST /api/domain/{domain_id}/join-request/bulk-reject/``

The mixin relies on ``_get_domain()`` and ``_check_can_approve()``
defined on the host viewset, plus the standard DRF ``get_serializer()``
and ``self.kwargs`` from ``GenericViewSet``.
"""
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404 as drf_get_object_or_404
from rest_framework.response import Response

from core.mailers.domain_join import (
    send_join_request_approved_email,
    send_join_request_rejected_email,
)
from domain.models import DomainJoinRequest
from domain.serializers import (
    DomainJoinRequestBulkApproveSerializer,
    DomainJoinRequestBulkRejectSerializer,
    DomainJoinRequestBulkResultSerializer,
    DomainJoinRequestRejectSerializer,
)
from domain.services import invalidate_moderation_tile_for_domain, record_audit

from ._helpers import client_ip


class JoinRequestModerationMixin:
    # See ``audit.py`` for why this mixin intentionally has no class
    # docstring (drf-spectacular fallback rules).

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, *args, **kwargs):
        domain = self._get_domain()
        self._check_can_approve(domain)
        with transaction.atomic():
            join_request = drf_get_object_or_404(
                DomainJoinRequest.objects.select_for_update(),
                pk=self.kwargs["req_id"],
                domain=domain,
            )
            if join_request.status != DomainJoinRequest.STATUS_PENDING:
                return Response(
                    {"detail": "not_pending"},
                    status=status.HTTP_409_CONFLICT,
                )
            join_request.status = DomainJoinRequest.STATUS_APPROVED
            join_request.decided_by = request.user
            join_request.decided_at = timezone.now()
            join_request.save(update_fields=["status", "decided_by", "decided_at", "updated_at"])
            domain.members.add(join_request.user)
            record_audit(
                domain=domain,
                action="join_request.approve",
                actor=request.user,
                target_user=join_request.user,
                metadata={"request_id": join_request.id, "remote_addr": client_ip(request)},
            )
            transaction.on_commit(
                lambda jr=join_request: send_join_request_approved_email(join_request=jr)
            )
            transaction.on_commit(
                lambda d=domain: invalidate_moderation_tile_for_domain(d)
            )
        return Response(self.get_serializer(join_request).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, *args, **kwargs):
        domain = self._get_domain()
        self._check_can_approve(domain)
        serializer = DomainJoinRequestRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get("reason", "")
        with transaction.atomic():
            join_request = drf_get_object_or_404(
                DomainJoinRequest.objects.select_for_update(),
                pk=self.kwargs["req_id"],
                domain=domain,
            )
            if join_request.status != DomainJoinRequest.STATUS_PENDING:
                return Response(
                    {"detail": "not_pending"},
                    status=status.HTTP_409_CONFLICT,
                )
            join_request.status = DomainJoinRequest.STATUS_REJECTED
            join_request.decided_by = request.user
            join_request.decided_at = timezone.now()
            join_request.reject_reason = reason
            join_request.save(update_fields=["status", "decided_by", "decided_at", "reject_reason", "updated_at"])
            record_audit(
                domain=domain,
                action="join_request.reject",
                actor=request.user,
                target_user=join_request.user,
                metadata={
                    "request_id": join_request.id,
                    "reason": reason,
                    "remote_addr": client_ip(request),
                },
            )
            transaction.on_commit(
                lambda jr=join_request: send_join_request_rejected_email(join_request=jr)
            )
            transaction.on_commit(
                lambda d=domain: invalidate_moderation_tile_for_domain(d)
            )
        return Response(self.get_serializer(join_request).data)

    @extend_schema(
        tags=["Domain"],
        summary="Approuver plusieurs demandes en une requête",
        request=DomainJoinRequestBulkApproveSerializer,
        responses={status.HTTP_200_OK: DomainJoinRequestBulkResultSerializer},
    )
    @action(detail=False, methods=["post"], url_path="bulk-approve")
    def bulk_approve(self, request, *args, **kwargs):
        domain = self._get_domain()
        self._check_can_approve(domain)
        serializer = DomainJoinRequestBulkApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data["request_ids"]

        now = timezone.now()
        processed = 0
        skipped = 0
        approved_rows: list[DomainJoinRequest] = []
        with transaction.atomic():
            rows = list(
                DomainJoinRequest.objects.select_for_update()
                .filter(pk__in=ids, domain=domain)
            )
            for jr in rows:
                if jr.status != DomainJoinRequest.STATUS_PENDING:
                    skipped += 1
                    continue
                jr.status = DomainJoinRequest.STATUS_APPROVED
                jr.decided_by = request.user
                jr.decided_at = now
                jr.save(update_fields=["status", "decided_by", "decided_at", "updated_at"])
                domain.members.add(jr.user)
                approved_rows.append(jr)
                processed += 1
            # Anything in ``ids`` that we did not see is also "skipped"
            # (gone, foreign-domain, etc.) — surface this in the count.
            skipped += len(ids) - len(rows)
            record_audit(
                domain=domain,
                action="join_request.bulk_approve",
                actor=request.user,
                metadata={
                    "processed": processed,
                    "skipped": skipped,
                    "remote_addr": client_ip(request),
                },
            )

        # Fire the notification emails after the transaction commits so
        # we do not spam users for rows that ultimately rolled back.
        def _notify():
            for jr in approved_rows:
                send_join_request_approved_email(join_request=jr)
        transaction.on_commit(_notify)
        if processed:
            transaction.on_commit(
                lambda d=domain: invalidate_moderation_tile_for_domain(d)
            )

        return Response({"processed": processed, "skipped": skipped})

    @extend_schema(
        tags=["Domain"],
        summary="Refuser plusieurs demandes en une requête",
        request=DomainJoinRequestBulkRejectSerializer,
        responses={status.HTTP_200_OK: DomainJoinRequestBulkResultSerializer},
    )
    @action(detail=False, methods=["post"], url_path="bulk-reject")
    def bulk_reject(self, request, *args, **kwargs):
        domain = self._get_domain()
        self._check_can_approve(domain)
        serializer = DomainJoinRequestBulkRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data["request_ids"]
        reason = serializer.validated_data.get("reason", "")

        now = timezone.now()
        processed = 0
        skipped = 0
        rejected_rows: list[DomainJoinRequest] = []
        with transaction.atomic():
            rows = list(
                DomainJoinRequest.objects.select_for_update()
                .filter(pk__in=ids, domain=domain)
            )
            for jr in rows:
                if jr.status != DomainJoinRequest.STATUS_PENDING:
                    skipped += 1
                    continue
                jr.status = DomainJoinRequest.STATUS_REJECTED
                jr.decided_by = request.user
                jr.decided_at = now
                jr.reject_reason = reason
                jr.save(update_fields=[
                    "status", "decided_by", "decided_at", "reject_reason", "updated_at",
                ])
                rejected_rows.append(jr)
                processed += 1
            skipped += len(ids) - len(rows)
            record_audit(
                domain=domain,
                action="join_request.bulk_reject",
                actor=request.user,
                metadata={
                    "processed": processed,
                    "skipped": skipped,
                    "reason": reason,
                    "remote_addr": client_ip(request),
                },
            )

        def _notify():
            for jr in rejected_rows:
                send_join_request_rejected_email(join_request=jr)
        transaction.on_commit(_notify)
        if processed:
            transaction.on_commit(
                lambda d=domain: invalidate_moderation_tile_for_domain(d)
            )

        return Response({"processed": processed, "skipped": skipped})
