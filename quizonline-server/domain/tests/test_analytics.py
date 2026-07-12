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
        self.owner = User.objects.create_user(email="o@example.test", password="p")
        self.mgr = User.objects.create_user(email="mgr@example.test", password="p")
        self.u1 = User.objects.create_user(email="u1@example.test", password="p")
        self.u2 = User.objects.create_user(email="u2@example.test", password="p")
        self.u3 = User.objects.create_user(email="u3@example.test", password="p")
        self.u4 = User.objects.create_user(email="u4@example.test", password="p")
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
        self.assertEqual(result["top_deciders"][0]["name"], self.owner.get_display_name())
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
        self.owner = User.objects.create_user(email="o@example.test", password="p")
        self.outsider = User.objects.create_user(email="x@example.test", password="p")
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


class AnalyticsRangeFilterTests(TestCase):
    URL = "/api/domain/{}/analytics/"

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(email="o@example.test", password="p")
        self.requester = User.objects.create_user(email="r@example.test", password="p")
        self.domain = Domain.objects.create(owner=self.owner, name="D", active=True)
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def _decision_at(self, *, days_ago: int, status_value: str):
        jr = DomainJoinRequest.objects.create(
            domain=self.domain, user=self.requester, status=status_value,
            decided_by=self.owner, decided_at=timezone.now(),
        )
        cutoff = timezone.now() - timedelta(days=days_ago)
        DomainJoinRequest.objects.filter(pk=jr.pk).update(
            created_at=cutoff - timedelta(seconds=30),
            decided_at=cutoff,
        )

    def test_range_7d_excludes_older_decisions(self):
        self._decision_at(days_ago=3, status_value=DomainJoinRequest.STATUS_APPROVED)
        self._decision_at(days_ago=50, status_value=DomainJoinRequest.STATUS_APPROVED)
        resp = self.client.get(self.URL.format(self.domain.id), {"range": "7d"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["approved_count"], 1)

    def test_range_all_includes_everything(self):
        self._decision_at(days_ago=3, status_value=DomainJoinRequest.STATUS_APPROVED)
        self._decision_at(days_ago=50, status_value=DomainJoinRequest.STATUS_APPROVED)
        resp = self.client.get(self.URL.format(self.domain.id), {"range": "all"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["approved_count"], 2)

    def test_unknown_range_falls_back_to_all(self):
        self._decision_at(days_ago=50, status_value=DomainJoinRequest.STATUS_APPROVED)
        resp = self.client.get(self.URL.format(self.domain.id), {"range": "lol"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["approved_count"], 1)

    def test_pending_count_not_affected_by_range(self):
        DomainJoinRequest.objects.create(domain=self.domain, user=self.requester)
        # Aged the row in the DB
        DomainJoinRequest.objects.update(created_at=timezone.now() - timedelta(days=90))
        resp = self.client.get(self.URL.format(self.domain.id), {"range": "7d"})
        self.assertEqual(resp.data["pending_count"], 1)


class AnalyticsCsvExportTests(TestCase):
    URL = "/api/domain/{}/analytics/export/"

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(email="o@example.test", password="p")
        self.outsider = User.objects.create_user(email="x@example.test", password="p")
        self.requester = User.objects.create_user(email="r@example.test", password="p")
        self.domain = Domain.objects.create(owner=self.owner, name="D", active=True)
        DomainJoinRequest.objects.create(
            domain=self.domain, user=self.requester,
            status=DomainJoinRequest.STATUS_APPROVED,
            decided_by=self.owner, decided_at=timezone.now(),
        )
        self.client = APIClient()

    def test_owner_gets_csv_with_attachment(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.get(self.URL.format(self.domain.id))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("text/csv", resp["Content-Type"])
        self.assertIn("attachment", resp["Content-Disposition"])
        body = resp.content.decode("utf-8")
        self.assertIn("metric,value", body)
        self.assertIn("approved_count,1", body)
        self.assertIn("top_decider_name,decision_count", body)
        self.assertIn(f"{self.owner.get_display_name()},1", body)

    def test_outsider_is_404(self):
        self.client.force_authenticate(self.outsider)
        resp = self.client.get(self.URL.format(self.domain.id))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_filename_carries_range(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.get(self.URL.format(self.domain.id), {"range": "30d"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn(f"domain-{self.domain.id}-analytics-30d.csv", resp["Content-Disposition"])
