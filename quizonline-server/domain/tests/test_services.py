"""
Tests for the lightweight helpers in :mod:`domain.services`.

The auto-decline path is exercised here rather than as a Celery
integration test: the Celery wrapper is a one-liner around
``auto_decline_stale_pending_requests``, so testing the helper directly
is enough.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from domain.models import Domain, DomainJoinRequest, JoinPolicy
from domain.services import auto_decline_stale_pending_requests

User = get_user_model()


class AutoDeclineStalePendingTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="o", password="p")
        self.user_a = User.objects.create_user(username="a", password="p", email="a@x.test")
        self.user_b = User.objects.create_user(username="b", password="p", email="b@x.test")
        self.user_c = User.objects.create_user(username="c", password="p", email="c@x.test")
        self.domain = Domain.objects.create(
            owner=self.owner, name="D", active=True, join_policy=JoinPolicy.OWNER,
        )

    def _make_request(self, *, user, days_ago: int, status: str = DomainJoinRequest.STATUS_PENDING):
        jr = DomainJoinRequest.objects.create(
            domain=self.domain, user=user, status=status,
        )
        # Force created_at to the desired age (Django sets it via auto_now_add).
        DomainJoinRequest.objects.filter(pk=jr.pk).update(
            created_at=timezone.now() - timedelta(days=days_ago),
        )
        jr.refresh_from_db()
        return jr

    def test_returns_zero_when_no_stale_requests(self):
        self._make_request(user=self.user_a, days_ago=1)
        self.assertEqual(auto_decline_stale_pending_requests(), 0)

    def test_cancels_pending_request_older_than_threshold(self):
        old = self._make_request(user=self.user_a, days_ago=45)
        self.assertEqual(auto_decline_stale_pending_requests(), 1)
        old.refresh_from_db()
        self.assertEqual(old.status, DomainJoinRequest.STATUS_CANCELLED)

    def test_leaves_recent_pending_alone(self):
        old = self._make_request(user=self.user_a, days_ago=45)
        recent = self._make_request(user=self.user_b, days_ago=10)
        self.assertEqual(auto_decline_stale_pending_requests(), 1)
        recent.refresh_from_db()
        self.assertEqual(recent.status, DomainJoinRequest.STATUS_PENDING)
        old.refresh_from_db()
        self.assertEqual(old.status, DomainJoinRequest.STATUS_CANCELLED)

    def test_leaves_already_decided_requests_alone(self):
        # Approved / rejected rows are historical records — never re-touch them.
        approved = self._make_request(
            user=self.user_a, days_ago=90, status=DomainJoinRequest.STATUS_APPROVED,
        )
        rejected = self._make_request(
            user=self.user_b, days_ago=90, status=DomainJoinRequest.STATUS_REJECTED,
        )
        cancelled = self._make_request(
            user=self.user_c, days_ago=90, status=DomainJoinRequest.STATUS_CANCELLED,
        )
        self.assertEqual(auto_decline_stale_pending_requests(), 0)
        for jr, expected in (
            (approved, DomainJoinRequest.STATUS_APPROVED),
            (rejected, DomainJoinRequest.STATUS_REJECTED),
            (cancelled, DomainJoinRequest.STATUS_CANCELLED),
        ):
            jr.refresh_from_db()
            self.assertEqual(jr.status, expected)

    def test_custom_threshold(self):
        jr = self._make_request(user=self.user_a, days_ago=8)
        self.assertEqual(auto_decline_stale_pending_requests(older_than_days=7), 1)
        jr.refresh_from_db()
        self.assertEqual(jr.status, DomainJoinRequest.STATUS_CANCELLED)
