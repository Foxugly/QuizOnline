"""
Audit-log slice of ``DomainViewSet``.

Two endpoints:
- ``GET /api/domain/{id}/audit/`` — paginated list with action/actor/since/until filters.
- ``GET /api/domain/{id}/audit/actions/`` — distinct action names for the filter dropdown.

Mixed into ``DomainViewSet`` so the standard owner/manager queryset
scoping + permission stack still applies (the mixin doesn't override
``get_permissions`` or ``get_queryset``).
"""
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from domain.models import DomainAuditLog
from domain.serializers import DomainAuditLogReadSerializer


def _parse_iso_datetime(value: str, *, end_of_day: bool = False):
    """
    Lenient parser for query-string datetime filters. Accepts full
    ISO-8601 datetimes (with or without timezone) and bare ``YYYY-MM-DD``
    dates. Returns a timezone-aware ``datetime`` or ``None`` if the input
    is unparseable — the caller skips the filter in that case rather
    than 400'ing, so a typo never wipes out the whole result set.

    ``end_of_day=True`` lifts a bare date to ``23:59:59.999999`` so the
    upper bound is inclusive of the whole day in UTC.
    """
    from datetime import datetime, time

    raw = (value or "").strip()
    if not raw:
        return None

    parsed = None
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed = datetime.combine(
                datetime.strptime(raw, "%Y-%m-%d").date(),
                time.max if end_of_day else time.min,
            )
        except ValueError:
            return None

    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


class DomainAuditActionsMixin:
    """Adds the ``audit`` and ``audit/actions`` endpoints to ``DomainViewSet``."""

    @extend_schema(
        tags=["Domain"],
        summary="Journal d'audit d'un domaine",
        description=(
            "Liste paginée des dernières actions administratives sur le "
            "domaine. Réservée aux owner / managers / superusers (la "
            "queryset du viewset gère déjà la confidentialité).\n\n"
            "Filtres optionnels (combinables) :\n"
            "- ``action`` : nom exact de l'action (ex. ``member.promote``).\n"
            "- ``actor`` : sous-chaîne, insensible à la casse, recherchée "
            "dans le ``username`` ou l'``email`` de l'acteur.\n"
            "- ``since`` / ``until`` : ISO-8601 (date ou datetime) sur "
            "``created_at``."
        ),
        parameters=[
            OpenApiParameter(
                "action", OpenApiTypes.STR, OpenApiParameter.QUERY,
                description="Exact match on the action name.",
            ),
            OpenApiParameter(
                "actor", OpenApiTypes.STR, OpenApiParameter.QUERY,
                description="Case-insensitive substring on the actor username or email.",
            ),
            OpenApiParameter(
                "since", OpenApiTypes.DATETIME, OpenApiParameter.QUERY,
                description="ISO-8601 lower bound (inclusive) on created_at.",
            ),
            OpenApiParameter(
                "until", OpenApiTypes.DATETIME, OpenApiParameter.QUERY,
                description="ISO-8601 upper bound (inclusive) on created_at.",
            ),
        ],
        responses={status.HTTP_200_OK: DomainAuditLogReadSerializer(many=True)},
    )
    @action(detail=True, methods=["get"], url_path="audit")
    def audit_log(self, request, *args, **kwargs):
        domain = self.get_object()
        qs = (
            DomainAuditLog.objects
            .filter(domain=domain)
            .select_related("actor", "target_user")
            .order_by("-created_at")
        )

        action_param = (request.query_params.get("action") or "").strip()
        if action_param:
            qs = qs.filter(action=action_param)

        actor_param = (request.query_params.get("actor") or "").strip()
        if actor_param:
            qs = qs.filter(
                Q(actor__username__icontains=actor_param)
                | Q(actor__email__icontains=actor_param)
            )

        since_param = (request.query_params.get("since") or "").strip()
        if since_param:
            parsed_since = _parse_iso_datetime(since_param)
            if parsed_since is not None:
                qs = qs.filter(created_at__gte=parsed_since)

        until_param = (request.query_params.get("until") or "").strip()
        if until_param:
            parsed_until = _parse_iso_datetime(until_param, end_of_day=True)
            if parsed_until is not None:
                qs = qs.filter(created_at__lte=parsed_until)

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = DomainAuditLogReadSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        return Response(DomainAuditLogReadSerializer(qs, many=True).data)

    @extend_schema(
        tags=["Domain"],
        summary="Actions distinctes journalisées sur un domaine",
        description=(
            "Liste triée et dédupliquée des valeurs ``action`` déjà "
            "enregistrées sur ce domaine. Sert à alimenter le filtre "
            "« action » de la page d'audit sans hardcoder la liste côté "
            "client."
        ),
        responses={status.HTTP_200_OK: OpenApiTypes.OBJECT},
    )
    @action(
        detail=True,
        methods=["get"],
        url_path="audit/actions",
        pagination_class=None,
    )
    def audit_actions(self, request, *args, **kwargs):
        domain = self.get_object()
        actions = list(
            DomainAuditLog.objects
            .filter(domain=domain)
            .values_list("action", flat=True)
            .distinct()
            .order_by("action")
        )
        return Response({"actions": actions})
