"""
Per-feature mixin classes for ``DomainViewSet``.

Each module owns one logical slice of the domain admin surface
(audit log, analytics, transfer, …) as a small mixin that contributes
its own ``@action`` methods, helpers and OpenAPI schemas. The main
``DomainViewSet`` composes them in ``domain/views.py``.

Re-exporting from this package keeps ``views.py`` imports tidy.
"""

from .analytics import DomainAnalyticsActionsMixin
from .audit import DomainAuditActionsMixin
from .transfer import DomainTransferActionsMixin

__all__ = [
    "DomainAnalyticsActionsMixin",
    "DomainAuditActionsMixin",
    "DomainTransferActionsMixin",
]
