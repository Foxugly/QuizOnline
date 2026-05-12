"""
Tests for the per-domain join-request analytics endpoint and helper.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import translation, timezone
from rest_framework import status
from rest_framework.test import APIClient

from domain.models import Domain, DomainJoinRequest, JoinPolicy
from domain.services import compute_join_request_analytics

User = get_user_model()


class ComputeAnalyticsTests(TestCase):
    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="o", password="p")
        self.mgr = User.objects.create_user(username="mgr", password="p")
        self.u1 = User.objects.create_user(username="u1", password="p")
        self.u2 = User.objects.create_user(username="u2", password="p")
        self.u3 = User.objects.create_user(username="u3", password="p")
        self.u4 = User.objects.create_user(username="u4", password="p")
        self.domain = Domain.objects.create(
            owner=self.owner, name="D", active=True, join_policy=JoinPolicy.OWNER,
        )

    def _decided(self, user, *, status_value, decided_by, delta_seconds):
        jr = DomainJoinRequest.objects.create(
            domain=self.domain, user=user, status=status_value,
            decided_by=decided_by, decided_at=timezone.now(),
        )
        DomainJoinRequest.objects.filter(pk=jr.pk).update(
            created_at=jr.decided_at - timedelta(seconds=delta_seconds),
        )
        return jr

    def test_empty_domain(self):
        result = compute_join_request_analytics(self.domain)
        self.assertEqual(result["pending_count"], 0)
        self.assertEqual(result["approved_count"], 0)
        self.assertEqual(result["rejected_count"], 0)
        self.assertEqual(result["total_decisions"], 0)
        self.assertIsNone(result["accept_rate_pct"])
        self.assertIsNone(result["median_decision_seconds"])
        self.assertEqual(result["top_deciders"], [])

    def test_counts_and_rate(self):
        DomainJoinRequest.objects.create(domain=self.domain, user=self.u1)  # pending
        self._decided(self.u2, status_value=DomainJoinRequest.STATUS_APPROVED,
                     decided_by=self.owner, delta_seconds=60)
        self._decided(self.u3, status_value=DomainJoinRequest.STATUS_APPROVED,
                     decided_by=self.owner, delta_seconds=120)
        self._decided(self.u4, status_value=DomainJoinRequest.STATUS_REJECTED,
                     decided_by=self.mgr, delta_seconds=300)

        result = compute_join_request_analytics(self.domain)
        self.assertEqual(result["pending_count"], 1)
        self.assertEqual(result["approved_count"], 2)
        self.assertEqual(result["rejected_count"], 1)
        self.assertEqual(result["total_decisions"], 3)
        # 2 / 3 = 66.7%
        self.assertEqual(result["accept_rate_pct"], 66.7)
        # Sorted deltas: [60, 120, 300] → median = 120
        self.assertEqual(result["median_decision_seconds"], 120)
        # Owner has 2 decisions, manager has 1 → owner first.
        self.assertEqual(result["top_deciders"][0]["username"], self.owner.username)
        self.assertEqual(result["top_deciders"][0]["count"], 2)

    def test_median_even_count(self):
        self._decided(self.u1, status_value=DomainJoinRequest.STATUS_APPROVED,
                     decided_by=self.owner, delta_seconds=10)
        self._decided(self.u2, status_value=DomainJoinRequest.STATUS_APPROVED,
                     decided_by=self.owner, delta_seconds=30)
        # Median of [10, 30] = 20 (integer average).
        result = compute_join_request_analytics(self.domain)
        self.assertEqual(result["median_decision_seconds"], 20)


class AnalyticsEndpointTests(TestCase):
    URL = "/api/domain/{}/analytics/"

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="o", password="p")
        self.outsider = User.objects.create_user(username="x", password="p")
        self.domain = Domain.objects.create(owner=self.owner, name="D", active=True)
        self.client = APIClient()

    def test_owner_can_access(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.get(self.URL.format(self.domain.id))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("pending_count", resp.data)
        self.assertIn("top_deciders", resp.data)

    def test_outsider_404(self):
        self.client.force_authenticate(self.outsider)
        resp = self.client.get(self.URL.format(self.domain.id))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
