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
from domain.services import (
    auto_decline_stale_pending_requests,
    domains_with_pending_for_user,
    send_expiring_join_request_warnings,
)
from core.models import OutboundEmail

User = get_user_model()


class AutoDeclineStalePendingTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email="o@example.test", password="p")
        self.user_a = User.objects.create_user(password="p", email="a@x.test")
        self.user_b = User.objects.create_user(password="p", email="b@x.test")
        self.user_c = User.objects.create_user(password="p", email="c@x.test")
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


class DomainsWithPendingForUserTests(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.owner = User.objects.create_user(email="own@example.test", password="p")
        self.manager = User.objects.create_user(email="mgr@example.test", password="p")
        self.stranger = User.objects.create_user(email="x@example.test", password="p")
        self.superuser = User.objects.create_user(
            email="root@example.test", password="p", is_superuser=True, is_staff=True,
        )

        self.applicant1 = User.objects.create_user(email="a1@example.test", password="p")
        self.applicant2 = User.objects.create_user(email="a2@example.test", password="p")

        # Domain A: owner+managers policy, owner sees it, manager sees it.
        self.domain_a = Domain.objects.create(
            owner=self.owner, name="A", active=True, join_policy=JoinPolicy.OWNER_MANAGERS,
        )
        self.domain_a.managers.add(self.manager)
        DomainJoinRequest.objects.create(domain=self.domain_a, user=self.applicant1)
        DomainJoinRequest.objects.create(domain=self.domain_a, user=self.applicant2)

        # Domain B: owner-only policy, only the owner can see it from the
        # moderation tile even though it has a manager listed.
        self.domain_b = Domain.objects.create(
            owner=self.owner, name="B", active=True, join_policy=JoinPolicy.OWNER,
        )
        self.domain_b.managers.add(self.manager)
        DomainJoinRequest.objects.create(domain=self.domain_b, user=self.applicant1)

        # Domain C: no pending — never appears.
        self.domain_c = Domain.objects.create(
            owner=self.owner, name="C", active=True, join_policy=JoinPolicy.OWNER_MANAGERS,
        )

    def test_anonymous_returns_empty(self):
        from django.contrib.auth.models import AnonymousUser
        self.assertEqual(domains_with_pending_for_user(AnonymousUser()), [])

    def test_stranger_returns_empty(self):
        self.assertEqual(domains_with_pending_for_user(self.stranger), [])

    def test_owner_sees_all_their_domains_with_pending(self):
        out = domains_with_pending_for_user(self.owner)
        ids = sorted(d["id"] for d in out)
        self.assertEqual(ids, sorted([self.domain_a.id, self.domain_b.id]))
        # Pending counts are accurate.
        by_id = {d["id"]: d for d in out}
        self.assertEqual(by_id[self.domain_a.id]["pending_count"], 2)
        self.assertEqual(by_id[self.domain_b.id]["pending_count"], 1)

    def test_manager_only_sees_owner_managers_policy_domains(self):
        out = domains_with_pending_for_user(self.manager)
        ids = [d["id"] for d in out]
        # Domain A: policy=OWNER_MANAGERS → manager sees it.
        # Domain B: policy=OWNER → manager does NOT see it.
        self.assertEqual(ids, [self.domain_a.id])

    def test_superuser_sees_everything(self):
        out = domains_with_pending_for_user(self.superuser)
        ids = sorted(d["id"] for d in out)
        self.assertEqual(ids, sorted([self.domain_a.id, self.domain_b.id]))

    def test_ordering_by_pending_count_desc(self):
        # Domain A has 2 pending, Domain B has 1: A first.
        out = domains_with_pending_for_user(self.owner)
        self.assertEqual([d["pending_count"] for d in out], [2, 1])

    def test_no_pending_domain_excluded(self):
        ids = [d["id"] for d in domains_with_pending_for_user(self.owner)]
        self.assertNotIn(self.domain_c.id, ids)

    def test_cached_within_ttl_then_invalidates_on_mutation(self):
        from django.core.cache import cache
        from domain.services import invalidate_moderation_tile_for_domain

        cache.clear()
        # First call populates the cache (does SQL).
        first = domains_with_pending_for_user(self.owner)
        self.assertEqual(len(first), 2)
        # Second call inside TTL hits cache → zero queries.
        with self.assertNumQueries(0):
            second = domains_with_pending_for_user(self.owner)
        self.assertEqual(second, first)
        # Invalidation drops the entry and the next call hits the DB again.
        invalidate_moderation_tile_for_domain(self.domain_a)
        with self.assertNumQueries(2):
            third = domains_with_pending_for_user(self.owner)
        self.assertEqual(third, first)

    def test_user_level_invalidation_drops_just_that_user(self):
        # ``invalidate_moderation_tile_for_users`` is the primitive
        # used when a manager is demoted / removed / leaves: the
        # affected user must lose their tile entry even though the
        # current managers list (read inside
        # ``invalidate_moderation_tile_for_domain``) no longer
        # contains them.
        from django.core.cache import cache
        from domain.services import invalidate_moderation_tile_for_users

        cache.clear()
        # Populate the cache for both the owner (sees 2 pending
        # domains) and the manager (sees 1, via OWNER_MANAGERS
        # policy on domain_a).
        domains_with_pending_for_user(self.owner)
        manager_first = domains_with_pending_for_user(self.manager)
        self.assertEqual(len(manager_first), 1)
        # Drop the manager's entry only.
        invalidate_moderation_tile_for_users([self.manager.id])
        # The manager's next call must hit SQL again, the owner's
        # next call must still be a cache hit.
        with self.assertNumQueries(2):
            domains_with_pending_for_user(self.manager)
        with self.assertNumQueries(0):
            domains_with_pending_for_user(self.owner)

    def test_query_count_is_bounded_when_many_domains(self):
        # Lock the moderation-tile query budget: with the prefetched
        # translations the work should be one SELECT for the domains
        # plus one SELECT for their translations — independent of the
        # number of domains. Without prefetching, ``safe_translation_getter``
        # would issue one extra SELECT per domain (the regression we
        # want to prevent).
        from django.core.cache import cache
        from django.utils import translation
        translation.activate("fr")
        # Add 4 more pending domains for the same owner.
        for i in range(4):
            d = Domain.objects.create(
                owner=self.owner, name=f"X{i}", active=True,
                join_policy=JoinPolicy.OWNER_MANAGERS,
            )
            DomainJoinRequest.objects.create(domain=d, user=self.applicant1)
        cache.clear()  # ensure we measure the uncached path
        with self.assertNumQueries(2):
            result = domains_with_pending_for_user(self.owner)
        # Sanity-check that we actually walked over 6 domains
        # (2 pre-existing + 4 added).
        self.assertEqual(len(result), 6)


class SendExpiringJoinRequestWarningsTests(TestCase):
    def setUp(self):
        from django.utils import translation
        translation.activate("fr")
        self.owner = User.objects.create_user(email="o@example.test", password="p")
        self.user = User.objects.create_user(password="p", email="u@x.test")
        self.domain = Domain.objects.create(
            owner=self.owner, name="D", active=True, join_policy=JoinPolicy.OWNER,
        )

    def _make_pending(self, *, days_ago: int) -> DomainJoinRequest:
        jr = DomainJoinRequest.objects.create(domain=self.domain, user=self.user)
        DomainJoinRequest.objects.filter(pk=jr.pk).update(
            created_at=timezone.now() - timedelta(days=days_ago),
        )
        jr.refresh_from_db()
        return jr

    def test_warns_request_in_warning_window(self):
        OutboundEmail.objects.all().delete()
        jr = self._make_pending(days_ago=28)  # 2 days from auto-decline
        sent = send_expiring_join_request_warnings(auto_decline_days=30, warn_days_before=3)
        self.assertEqual(sent, 1)
        self.assertEqual(OutboundEmail.objects.count(), 1)
        jr.refresh_from_db()
        self.assertIsNotNone(jr.expiry_warning_sent_at)

    def test_ignores_recent_requests(self):
        self._make_pending(days_ago=5)
        self.assertEqual(send_expiring_join_request_warnings(), 0)

    def test_ignores_already_warned(self):
        jr = self._make_pending(days_ago=28)
        jr.expiry_warning_sent_at = timezone.now()
        jr.save(update_fields=["expiry_warning_sent_at"])
        self.assertEqual(send_expiring_join_request_warnings(), 0)

    def test_ignores_past_threshold(self):
        # > auto_decline_days old: belongs to the auto-cancel sweep,
        # not the warning window.
        self._make_pending(days_ago=45)
        self.assertEqual(send_expiring_join_request_warnings(), 0)

    def test_idempotent_within_a_day(self):
        OutboundEmail.objects.all().delete()
        self._make_pending(days_ago=28)
        first = send_expiring_join_request_warnings()
        second = send_expiring_join_request_warnings()
        self.assertEqual(first, 1)
        self.assertEqual(second, 0)
        self.assertEqual(OutboundEmail.objects.count(), 1)


class ModerationSummaryEndpointTests(TestCase):
    URL = "/api/domain/moderation-summary/"

    def setUp(self):
        from django.core.cache import cache
        from rest_framework.test import APIClient

        # The moderation tile is now cached per-user; clear between tests
        # so a previous test's payload cannot leak into ours via a recycled
        # user id (the DB rolls back, the process cache doesn't).
        cache.clear()

        self.owner = User.objects.create_user(email="o@example.test", password="p")
        self.applicant = User.objects.create_user(email="a@example.test", password="p")
        self.domain = Domain.objects.create(
            owner=self.owner, name="D", active=True, join_policy=JoinPolicy.OWNER,
        )
        DomainJoinRequest.objects.create(domain=self.domain, user=self.applicant)
        self.client = APIClient()

    def test_requires_authentication(self):
        resp = self.client.get(self.URL)
        self.assertEqual(resp.status_code, 401)

    def test_returns_pending_summary_for_owner(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.get(self.URL)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        item = resp.data[0]
        self.assertEqual(item["id"], self.domain.id)
        self.assertEqual(item["pending_count"], 1)
        self.assertTrue(item["name"])

    def test_returns_empty_for_unrelated_user(self):
        other = User.objects.create_user(email="x@example.test", password="p")
        self.client.force_authenticate(other)
        resp = self.client.get(self.URL)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data, [])
