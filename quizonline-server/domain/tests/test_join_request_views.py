from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import translation
from rest_framework import status
from rest_framework.test import APIClient, APIRequestFactory

from core.models import OutboundEmail
from domain.models import Domain, DomainJoinRequest, JoinPolicy
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


class JoinRequestCreateEndpointTests(TestCase):
    URL = "/api/domain/{}/join-request/"

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="ow", password="pwd", email="o@x.test")
        self.manager = User.objects.create_user(username="mg", password="pwd", email="m@x.test")
        self.joiner = User.objects.create_user(username="jo", password="pwd", email="j@x.test")
        self.member = User.objects.create_user(username="me", password="pwd")
        self.domain_auto = Domain.objects.create(owner=self.owner, name="A", active=True)
        self.domain_validation = Domain.objects.create(owner=self.owner, name="V", active=True)
        self.domain_validation.join_policy = JoinPolicy.OWNER
        self.domain_validation.save(update_fields=["join_policy"])
        self.domain_validation.members.add(self.member)
        self.domain_inactive = Domain.objects.create(owner=self.owner, name="I", active=False)
        self.client = APIClient()

    def test_post_on_auto_domain_links_directly_no_record(self):
        self.client.force_authenticate(user=self.joiner)
        res = self.client.post(self.URL.format(self.domain_auto.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "approved")
        self.assertIsNone(res.data["request"])
        self.assertTrue(self.domain_auto.members.filter(pk=self.joiner.pk).exists())
        self.assertEqual(
            DomainJoinRequest.objects.filter(domain=self.domain_auto, user=self.joiner).count(),
            0,
        )

    def test_post_on_validation_domain_creates_pending(self):
        self.client.force_authenticate(user=self.joiner)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(self.URL.format(self.domain_validation.id))
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], "pending")
        self.assertIsNotNone(res.data["request"])
        req = DomainJoinRequest.objects.get(domain=self.domain_validation, user=self.joiner)
        self.assertEqual(req.status, "pending")
        # Email enqueued for the owner.
        self.assertTrue(
            any(self.owner.email in row.recipients for row in OutboundEmail.objects.all())
        )

    def test_post_validation_domain_idempotent_returns_existing_pending(self):
        self.client.force_authenticate(user=self.joiner)
        first = self.client.post(self.URL.format(self.domain_validation.id))
        second = self.client.post(self.URL.format(self.domain_validation.id))
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data["request"]["id"], first.data["request"]["id"])
        self.assertEqual(
            DomainJoinRequest.objects.filter(domain=self.domain_validation, user=self.joiner).count(),
            1,
        )

    def test_post_when_already_member_returns_409(self):
        self.client.force_authenticate(user=self.member)
        res = self.client.post(self.URL.format(self.domain_validation.id))
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

    def test_post_when_owner_returns_400(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(self.URL.format(self.domain_validation.id))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_post_on_inactive_domain_returns_404(self):
        self.client.force_authenticate(user=self.joiner)
        res = self.client.post(self.URL.format(self.domain_inactive.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_post_owner_managers_policy_emails_owner_and_managers(self):
        self.domain_validation.join_policy = JoinPolicy.OWNER_MANAGERS
        self.domain_validation.save(update_fields=["join_policy"])
        self.domain_validation.managers.add(self.manager)
        self.client.force_authenticate(user=self.joiner)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(self.URL.format(self.domain_validation.id))
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        recipients = set()
        for outbound in OutboundEmail.objects.all():
            recipients.update(outbound.recipients)
        self.assertIn(self.owner.email, recipients)
        self.assertIn(self.manager.email, recipients)
