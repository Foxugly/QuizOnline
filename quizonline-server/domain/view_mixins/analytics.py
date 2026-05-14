"""
Analytics slice of ``DomainViewSet``.

Two endpoints:
- ``GET /api/domain/{id}/analytics/`` — JSON counters + median + top deciders.
- ``GET /api/domain/{id}/analytics/export/`` — same data as a CSV download.

Both honour the ``range`` query parameter (``7d`` / ``30d`` / ``90d``
/ ``all``, default ``all``). The actual stat computation lives in
``domain/services.compute_join_request_analytics`` — the mixin just
wires HTTP semantics around it.
"""
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from domain.serializers import DomainAnalyticsSerializer
from domain.services import compute_join_request_analytics, resolve_analytics_range


class DomainAnalyticsActionsMixin:
    """Adds the ``analytics`` and ``analytics/export`` endpoints to ``DomainViewSet``."""

    @extend_schema(
        tags=["Domain"],
        summary="Statistiques de modération pour un domaine",
        description=(
            "Counts par statut, taux d'acceptation, délai médian de "
            "décision et top des modérateurs. Accessible aux owner / "
            "managers du domaine (via la queryset scope habituelle).\n\n"
            "Le paramètre ``range`` (``7d``, ``30d``, ``90d`` ou "
            "``all``, défaut ``all``) restreint les statistiques de "
            "décision (approuvées, refusées, taux, médiane, top) à la "
            "fenêtre demandée. ``pending_count`` et ``cancelled_count`` "
            "restent toujours des instantanés courants."
        ),
        parameters=[
            OpenApiParameter(
                "range", OpenApiTypes.STR, OpenApiParameter.QUERY,
                description="Time window for decision stats: 7d | 30d | 90d | all (default all).",
                enum=["7d", "30d", "90d", "all"],
            ),
        ],
        responses={status.HTTP_200_OK: DomainAnalyticsSerializer},
    )
    @action(detail=True, methods=["get"], url_path="analytics", pagination_class=None)
    def analytics(self, request, *args, **kwargs):
        domain = self.get_object()
        _, since = resolve_analytics_range(request.query_params.get("range"))
        return Response(compute_join_request_analytics(domain, since=since))

    @extend_schema(
        tags=["Domain"],
        summary="Export CSV des statistiques de modération",
        description=(
            "Renvoie un CSV (UTF-8, en-tête sur la première ligne) "
            "résumant les statistiques du domaine pour la fenêtre "
            "demandée. Honore le paramètre ``range`` comme l'endpoint "
            "JSON. Idéal pour reporting hors-app."
        ),
        parameters=[
            OpenApiParameter(
                "range", OpenApiTypes.STR, OpenApiParameter.QUERY,
                description="Time window: 7d | 30d | 90d | all (default all).",
                enum=["7d", "30d", "90d", "all"],
            ),
        ],
        responses={status.HTTP_200_OK: OpenApiTypes.BINARY},
    )
    @action(
        detail=True,
        methods=["get"],
        url_path="analytics/export",
        pagination_class=None,
    )
    def analytics_export(self, request, *args, **kwargs):
        import csv
        import io
        from django.http import HttpResponse

        domain = self.get_object()
        range_key, since = resolve_analytics_range(request.query_params.get("range"))
        data = compute_join_request_analytics(domain, since=since)

        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["metric", "value"])
        writer.writerow(["range", range_key])
        writer.writerow(["pending_count", data["pending_count"]])
        writer.writerow(["approved_count", data["approved_count"]])
        writer.writerow(["rejected_count", data["rejected_count"]])
        writer.writerow(["cancelled_count", data["cancelled_count"]])
        writer.writerow(["total_decisions", data["total_decisions"]])
        writer.writerow([
            "accept_rate_pct",
            "" if data["accept_rate_pct"] is None else data["accept_rate_pct"],
        ])
        writer.writerow([
            "median_decision_seconds",
            "" if data["median_decision_seconds"] is None else data["median_decision_seconds"],
        ])
        writer.writerow([])
        writer.writerow(["top_decider_username", "decision_count"])
        for row in data["top_deciders"]:
            writer.writerow([row["username"], row["count"]])

        response = HttpResponse(buf.getvalue(), content_type="text/csv; charset=utf-8")
        filename = f"domain-{domain.id}-analytics-{range_key}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
