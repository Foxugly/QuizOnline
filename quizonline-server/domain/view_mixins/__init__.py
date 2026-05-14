"""
Per-feature mixin classes for the two domain viewsets.

Each module owns one logical slice as a small mixin that contributes
its own ``@action`` methods, helpers and OpenAPI schemas. The host
viewsets in ``domain/views.py`` compose them:

- ``DomainViewSet`` (analytics, audit, invitations, members, transfer)
- ``DomainJoinRequestViewSet`` (moderation = approve/reject/bulk;
  cancel = requester-only)

Re-exporting from this package keeps ``views.py`` imports tidy.
"""

from .analytics import DomainAnalyticsActionsMixin
from .audit import DomainAuditActionsMixin
from .invitations import DomainInvitationsActionsMixin
from .join_request_cancel import JoinRequestCancelMixin
from .join_request_moderation import JoinRequestModerationMixin
from .members import DomainMembersActionsMixin
from .transfer import DomainTransferActionsMixin

__all__ = [
    "DomainAnalyticsActionsMixin",
    "DomainAuditActionsMixin",
    "DomainInvitationsActionsMixin",
    "DomainMembersActionsMixin",
    "DomainTransferActionsMixin",
    "JoinRequestCancelMixin",
    "JoinRequestModerationMixin",
]
