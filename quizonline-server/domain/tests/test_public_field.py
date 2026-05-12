"""
Regression tests for the ``Domain.public`` field.

Private (``public=False``) domains are hidden from:

- the public discovery catalog (``/api/domain/available-for-linking/``);
- the join-request create action (which returns 404 to avoid leaking
  the existence of a private domain to outsiders).

Existing members continue to see and use a private domain — visibility
only, not access.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import translation
from rest_framework import status
from rest_framework.test import APIClient

from domain.invite_token import make_invite_token
from domain.models import Domain, DomainJoinRequest, JoinPolicy

User = get_user_model()


class PublicFieldDefaultsTests(TestCase):
    def setUp(self):
        # parler needs an active language to instantiate translatable models;
        # other tests in this suite that run before ours leave the thread
        # state inconsistent. Re-activating defensively here is cheap.
        translation.activate("fr")

    def test_new_domains_are_public_by_default(self):
        owner = User.objects.create_user(username="o", password="p")
        d = Domain.objects.create(owner=owner, name="D", active=True)
        self.assertTrue(d.public)


class AvailableForLinkingTests(TestCase):
    URL = "/api/domain/available-for-linking/"

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="o", password="p")
        self.outsider = User.objects.create_user(username="x", password="p")
        self.public_domain = Domain.objects.create(
            owner=self.owner, name="Pub", active=True, public=True,
        )
        self.private_domain = Domain.objects.create(
            owner=self.owner, name="Priv", active=True, public=False,
        )
        self.client = APIClient()

    def test_anonymous_only_sees_public_domains(self):
        resp = self.client.get(self.URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in resp.data}
        self.assertIn(self.public_domain.id, ids)
        self.assertNotIn(self.private_domain.id, ids)

    def test_authenticated_outsider_only_sees_public_domains(self):
        self.client.force_authenticate(self.outsider)
        resp = self.client.get(self.URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in resp.data}
        self.assertNotIn(self.private_domain.id, ids)


class JoinRequestCreateOnPrivateTests(TestCase):
    URL = "/api/domain/{}/join-request/"

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="o", password="p")
        self.outsider = User.objects.create_user(username="x", password="p", email="x@x.test")
        self.private_domain = Domain.objects.create(
            owner=self.owner, name="Priv", active=True, public=False, join_policy=JoinPolicy.AUTO,
        )
        self.client = APIClient()

    def test_outsider_cannot_join_private_domain_via_join_request(self):
        self.client.force_authenticate(self.outsider)
        resp = self.client.post(self.URL.format(self.private_domain.id))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(resp.data["detail"], "not_found")
        self.assertFalse(
            self.private_domain.members.filter(pk=self.outsider.pk).exists()
        )
        self.assertFalse(
            DomainJoinRequest.objects.filter(domain=self.private_domain).exists()
        )

    def test_public_domain_unchanged(self):
        # Same domain but flipped public → the join still works as before.
        self.private_domain.public = True
        self.private_domain.save(update_fields=["public"])
        self.client.force_authenticate(self.outsider)
        resp = self.client.post(self.URL.format(self.private_domain.id))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(
            self.private_domain.members.filter(pk=self.outsider.pk).exists()
        )


class InviteFlowWorksOnPrivateDomainTests(TestCase):
    """The invitation flow is *the* way into a private domain — make sure
    we did not break it while plugging the catalog leak."""

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="o", password="p", email="o@x.test")
        self.invited = User.objects.create_user(
            username="invited", password="p", email="invited@x.test",
        )
        self.private_domain = Domain.objects.create(
            owner=self.owner, name="Priv", active=True, public=False,
        )
        self.client = APIClient()

    def test_owner_can_invite_to_private_domain(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.post(
            f"/api/domain/{self.private_domain.id}/invite/",
            {"emails": ["invited@x.test"], "language": "en"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data[0]["status"], "sent")

    def test_invitee_can_accept_invitation_on_private_domain(self):
        token = make_invite_token(
            domain_id=self.private_domain.id,
            email=self.invited.email,
            inviter_id=self.owner.id,
        )
        self.client.force_authenticate(self.invited)
        resp = self.client.post(f"/api/domain/invite/accept/{token}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["state"], "accepted")
        self.assertTrue(
            self.private_domain.members.filter(pk=self.invited.pk).exists()
        )
