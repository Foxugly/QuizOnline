from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from config.permissions import IsSuperUser
from config.tools import ErrorDetailSerializer
from domain.models import Domain
from question.models import Question
from quiz.models import Quiz

User = get_user_model()


class _DomainStatsSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    translations = serializers.JSONField()
    members_count = serializers.IntegerField()
    managers_count = serializers.IntegerField()
    questions_count = serializers.IntegerField()
    templates_count = serializers.IntegerField()
    sessions_total = serializers.IntegerField()
    sessions_completed = serializers.IntegerField()


class _TotalsSerializer(serializers.Serializer):
    active_users = serializers.IntegerField()
    active_domains = serializers.IntegerField()
    active_questions = serializers.IntegerField()
    completed_sessions = serializers.IntegerField()


class DashboardStatsResponseSerializer(serializers.Serializer):
    totals = _TotalsSerializer()
    domains = _DomainStatsSerializer(many=True)


@extend_schema_view(
    get=extend_schema(
        tags=["Admin"],
        summary="Statistiques du tableau de bord",
        responses={
            200: DashboardStatsResponseSerializer,
            401: OpenApiResponse(response=ErrorDetailSerializer, description="Unauthorized"),
            403: OpenApiResponse(response=ErrorDetailSerializer, description="Forbidden (superuser only)"),
        },
    ),
)
class DashboardStatsView(APIView):
    """
    GET /api/stats/dashboard/
    Returns platform statistics scoped by the requesting user's domain access.
    Superusers see everything; other staff see only domains they own or manage.
    """

    permission_classes = [IsSuperUser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "admin"

    def get(self, request):
        user = request.user

        # --- determine visible domains ---
        if user.is_superuser:
            domains_qs = Domain.objects.filter(active=True)
        else:
            domains_qs = Domain.objects.filter(
                active=True,
            ).filter(Q(owner=user) | Q(managers=user)).distinct()

        domain_ids = list(domains_qs.values_list("id", flat=True))

        # --- totals (scoped) ---
        if user.is_superuser:
            active_users = User.objects.filter(is_active=True).count()
        else:
            # users who are members of visible domains
            active_users = (
                User.objects.filter(is_active=True, linked_domains__id__in=domain_ids)
                .distinct()
                .count()
            )

        active_domains = len(domain_ids)
        active_questions = Question.objects.filter(
            active=True, domain_id__in=domain_ids,
        ).count()
        completed_sessions = Quiz.objects.filter(
            active=False,
            started_at__isnull=False,
            domain_id__in=domain_ids,
        ).count()

        # --- per-domain breakdown (annotated) ---
        domains_annotated = domains_qs.annotate(
            _members_count=Count("members", distinct=True),
            _managers_count=Count("managers", distinct=True),
            _questions_count=Count(
                "questions",
                filter=Q(questions__active=True),
                distinct=True,
            ),
            _templates_count=Count(
                "quiz_templates",
                filter=Q(quiz_templates__active=True),
                distinct=True,
            ),
            _sessions_total=Count("quiz", distinct=True),
            _sessions_completed=Count(
                "quiz",
                filter=Q(quiz__active=False, quiz__started_at__isnull=False),
                distinct=True,
            ),
        ).order_by("id")

        # prefetch translations
        domains_list = list(domains_annotated.prefetch_related("translations"))

        domains_data = []
        for d in domains_list:
            translations = {}
            for t in d.translations.all():
                translations[t.language_code] = {"name": t.name or ""}
            domains_data.append({
                "id": d.pk,
                "translations": translations,
                "members_count": d._members_count,
                "managers_count": d._managers_count,
                "questions_count": d._questions_count,
                "templates_count": d._templates_count,
                "sessions_total": d._sessions_total,
                "sessions_completed": d._sessions_completed,
            })

        return Response({
            "totals": {
                "active_users": active_users,
                "active_domains": active_domains,
                "active_questions": active_questions,
                "completed_sessions": completed_sessions,
            },
            "domains": domains_data,
        })
