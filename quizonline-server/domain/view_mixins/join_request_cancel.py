"""
Requester-only cancellation action on ``DomainJoinRequestViewSet``.

Single endpoint:
- ``POST /api/domain/{domain_id}/join-request/{req_id}/cancel/``

Kept separate from ``JoinRequestModerationMixin`` because the
authorisation rule is fundamentally different: cancellation is a
requester-only action (or superuser bypass), whereas approve/reject
are owner/manager actions. Mixing them in one class invites bugs
where someone copies the wrong gate.
"""
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import get_object_or_404 as drf_get_object_or_404
from rest_framework.response import Response

from domain.models import DomainJoinRequest
from domain.services import invalidate_moderation_tile_for_domain


class JoinRequestCancelMixin:
    # See ``audit.py`` for why this mixin intentionally has no class
    # docstring (drf-spectacular fallback rules).

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, *args, **kwargs):
        """
        Cancel a pending join request.

        Two intentional design choices that should NOT be "fixed":

        1. No `transaction.atomic` / `select_for_update`. Cancellation is a
           monotonic single-column write (pending → cancelled) with no side
           effects. Two concurrent cancels collapse to the same terminal
           state — idempotent at the row level. An approve-vs-cancel race
           is last-write-wins by design (the HTTP client that lost the race
           observes the final state on next fetch).

        2. The approver gate (`_check_can_approve`) is intentionally NOT
           reused here. Cancellation is a requester-only action: only the
           user who created the request (or a superuser) can cancel it.
           The domain owner can approve and reject, but cannot cancel
           someone else's request — that's a different concept.
        """
        domain = self._get_domain()
        join_request = drf_get_object_or_404(
            DomainJoinRequest.objects.all(),
            pk=self.kwargs["req_id"],
            domain=domain,
        )
        is_superuser = bool(getattr(request.user, "is_superuser", False))
        if join_request.user_id != request.user.id and not is_superuser:
            raise PermissionDenied("only_requester_can_cancel")
        if join_request.status != DomainJoinRequest.STATUS_PENDING:
            return Response(
                {"detail": "not_pending"},
                status=status.HTTP_409_CONFLICT,
            )
        join_request.status = DomainJoinRequest.STATUS_CANCELLED
        join_request.save(update_fields=["status", "updated_at"])
        # Synchronous invalidation (no ``transaction.on_commit`` wrap) is
        # safe here because this endpoint deliberately does not open an
        # outer ``transaction.atomic`` — see the docstring above — and
        # the project does not enable ``ATOMIC_REQUESTS``. The ``save``
        # above runs in autocommit, so by the time we get here the new
        # status is durably visible to other readers.
        invalidate_moderation_tile_for_domain(domain)
        return Response(self.get_serializer(join_request).data)
