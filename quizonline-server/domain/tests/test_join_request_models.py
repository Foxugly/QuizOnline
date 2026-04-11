from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import translation

from domain.models import Domain, DomainJoinRequest

User = get_user_model()


class DomainJoinPolicyTests(TestCase):
    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="owner", password="pwd")

    def test_join_policy_defaults_to_auto(self):
        domain = Domain.objects.create(owner=self.owner, name="D1", description="", active=True)
        self.assertEqual(domain.join_policy, "auto")


class DomainJoinRequestModelTests(TestCase):
    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="owner2", password="pwd")
        self.user = User.objects.create_user(username="joiner", password="pwd")
        self.domain = Domain.objects.create(owner=self.owner, name="D2", description="", active=True)

    def test_default_status_is_pending(self):
        req = DomainJoinRequest.objects.create(domain=self.domain, user=self.user)
        self.assertEqual(req.status, "pending")

    def test_partial_unique_constraint_blocks_second_pending(self):
        DomainJoinRequest.objects.create(domain=self.domain, user=self.user)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                DomainJoinRequest.objects.create(domain=self.domain, user=self.user)

    def test_partial_unique_allows_new_pending_after_rejection(self):
        first = DomainJoinRequest.objects.create(domain=self.domain, user=self.user)
        first.status = DomainJoinRequest.STATUS_REJECTED
        first.save(update_fields=["status"])
        # Should not raise — the partial unique only applies to status="pending".
        DomainJoinRequest.objects.create(domain=self.domain, user=self.user)
