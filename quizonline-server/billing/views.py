from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from domain.models import Domain
from domain.permissions import IsDomainOwnerOrManager

from .serializers import DomainBillingSerializer
from .services import get_or_create_billing, recompute_member_count


class DomainBillingView(APIView):
    """Subscription status for a domain — visible to its owner/manager.

    Reports the current plan, the operator-set free deadline, the live member
    count and the monthly price (EUR HTVA) that count implies.
    """

    permission_classes = [IsAuthenticated, IsDomainOwnerOrManager]

    @extend_schema(responses=DomainBillingSerializer)
    def get(self, request, domain_id: int):
        domain = get_object_or_404(Domain, pk=domain_id)
        self.check_object_permissions(request, domain)
        billing = get_or_create_billing(domain)
        # Keep the member count fresh for the on-demand read (one COUNT).
        recompute_member_count(billing)
        return Response(DomainBillingSerializer(billing).data)
