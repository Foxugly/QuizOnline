from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import translation
from rest_framework.test import APIRequestFactory

from domain.models import Domain, JoinPolicy
from domain.permissions import CanApproveJoinRequest

User = get_user_model()


class CanApproveJoinRequestTests(TestCase):
    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="owner", password="pwd")
        self.manager = User.objects.create_user(username="mgr", password="pwd")
        self.stranger = User.objects.create_user(username="stranger", password="pwd")
        self.superuser = User.objects.create_user(
            username="root", password="pwd", is_superuser=True, is_staff=True
        )
        self.domain = Domain.objects.create(owner=self.owner, name="D", active=True)
        self.domain.managers.add(self.manager)
        self.factory = APIRequestFactory()
        self.perm = CanApproveJoinRequest()

    def _req(self, user):
        r = self.factory.get("/")
        r.user = user
        return r

    def test_owner_always_allowed(self):
        self.domain.join_policy = JoinPolicy.OWNER
        self.domain.save(update_fields=["join_policy"])
        self.assertTrue(
            self.perm.has_object_permission(self._req(self.owner), None, self.domain)
        )

    def test_manager_allowed_only_when_policy_is_owner_managers(self):
        self.domain.join_policy = JoinPolicy.OWNER
        self.domain.save(update_fields=["join_policy"])
        self.assertFalse(
            self.perm.has_object_permission(self._req(self.manager), None, self.domain)
        )

        self.domain.join_policy = JoinPolicy.OWNER_MANAGERS
        self.domain.save(update_fields=["join_policy"])
        self.assertTrue(
            self.perm.has_object_permission(self._req(self.manager), None, self.domain)
        )

    def test_stranger_never_allowed(self):
        for policy in (JoinPolicy.OWNER, JoinPolicy.OWNER_MANAGERS, JoinPolicy.AUTO):
            self.domain.join_policy = policy
            self.domain.save(update_fields=["join_policy"])
            self.assertFalse(
                self.perm.has_object_permission(
                    self._req(self.stranger), None, self.domain
                )
            )

    def test_superuser_always_allowed(self):
        self.domain.join_policy = JoinPolicy.OWNER
        self.domain.save(update_fields=["join_policy"])
        self.assertTrue(
            self.perm.has_object_permission(
                self._req(self.superuser), None, self.domain
            )
        )
