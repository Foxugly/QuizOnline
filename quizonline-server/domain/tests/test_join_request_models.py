from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import translation

from domain.models import Domain

User = get_user_model()


class DomainJoinPolicyTests(TestCase):
    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="owner", password="pwd")

    def test_join_policy_defaults_to_auto(self):
        domain = Domain.objects.create(owner=self.owner, name="D1", description="", active=True)
        self.assertEqual(domain.join_policy, "auto")
