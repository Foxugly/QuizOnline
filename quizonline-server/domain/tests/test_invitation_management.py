"""
Tests for the persisted-invitation management endpoints:

- ``GET /api/domain/{id}/invitations/`` — list pending invites
- ``POST /api/domain/{id}/invitations/<invite_id>/resend/``
- ``POST /api/domain/{id}/invitations/<invite_id>/revoke/``

Plus the revoke-enforcement in the accept endpoint: a token whose row
has been revoked is no longer consumable, even though the signature
itself still verifies.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import translation, timezone
from rest_framework import status
from rest_framework.test import APIClient

from core.models import OutboundEmail
from domain.invite_token import make_invite_token
from domain.models import Domain, DomainInvite

User = get_user_model()


class ListInvitationsTests(TestCase):
    URL = "/api/domain/{}/invitations/"

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="o", password="p", email="o@x.test")
        self.stranger = User.objects.create_user(username="x", password="p", email="x@x.test")
        self.domain = Domain.objects.create(owner=self.owner, name="D", active=True)
        # Two pending and one already-accepted invitation.
        DomainInvite.objects.create(
            domain=self.domain, email="a@x.test", inviter=self.owner,
            expires_at=timezone.now() + timedelta(days=7),
        )
        DomainInvite.objects.create(
            domain=self.domain, email="b@x.test", inviter=self.owner,
            expires_at=timezone.now() + timedelta(days=7),
        )
        DomainInvite.objects.create(
            domain=self.domain, email="old@x.test", inviter=self.owner,
            status=DomainInvite.STATUS_ACCEPTED,
            expires_at=timezone.now() + timedelta(days=7),
        )
        self.client = APIClient()

    def test_owner_lists_only_pending_invitations(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.get(self.URL.format(self.domain.id))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        emails = sorted(row["email"] for row in resp.data)
        self.assertEqual(emails, ["a@x.test", "b@x.test"])
        for row in resp.data:
            self.assertEqual(row["status"], "pending")
            self.assertEqual(row["inviter_username"], self.owner.username)

    def test_stranger_cannot_list(self):
        self.client.force_authenticate(self.stranger)
        resp = self.client.get(self.URL.format(self.domain.id))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class ResendInvitationTests(TestCase):
    URL = "/api/domain/{}/invitations/{}/resend/"

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="o", password="p", email="o@x.test")
        self.domain = Domain.objects.create(owner=self.owner, name="D", active=True)
        self.invite = DomainInvite.objects.create(
            domain=self.domain, email="a@x.test", inviter=self.owner,
            expires_at=timezone.now() + timedelta(days=7),
        )
        # Backdate the row so we can detect the refresh.
        DomainInvite.objects.filter(pk=self.invite.pk).update(
            last_sent_at=timezone.now() - timedelta(days=3),
        )
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def test_resend_refreshes_last_sent_at_and_queues_email(self):
        OutboundEmail.objects.all().delete()
        resp = self.client.post(self.URL.format(self.domain.id, self.invite.id))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.invite.refresh_from_db()
        self.assertGreater(
            self.invite.last_sent_at,
            timezone.now() - timedelta(minutes=1),
        )
        self.assertEqual(OutboundEmail.objects.count(), 1)
        self.assertIn("a@x.test", OutboundEmail.objects.first().recipients)

    def test_resend_rejects_already_accepted_row(self):
        self.invite.status = DomainInvite.STATUS_ACCEPTED
        self.invite.save(update_fields=["status"])
        resp = self.client.post(self.URL.format(self.domain.id, self.invite.id))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class RevokeInvitationTests(TestCase):
    URL = "/api/domain/{}/invitations/{}/revoke/"

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="o", password="p", email="o@x.test")
        self.invited = User.objects.create_user(username="i", password="p", email="invited@x.test")
        self.domain = Domain.objects.create(owner=self.owner, name="D", active=True)
        self.invite = DomainInvite.objects.create(
            domain=self.domain, email="invited@x.test", inviter=self.owner,
            expires_at=timezone.now() + timedelta(days=7),
        )
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def test_revoke_marks_row_revoked(self):
        resp = self.client.post(self.URL.format(self.domain.id, self.invite.id))
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.invite.refresh_from_db()
        self.assertEqual(self.invite.status, DomainInvite.STATUS_REVOKED)

    def test_revoked_token_is_no_longer_accepted(self):
        # Mint a token for the persisted invite, revoke the row, then
        # try to accept — the accept endpoint must refuse.
        token = make_invite_token(
            domain_id=self.domain.id,
            email="invited@x.test",
            inviter_id=self.owner.id,
        )
        self.invite.status = DomainInvite.STATUS_REVOKED
        self.invite.save(update_fields=["status"])

        self.client.force_authenticate(self.invited)
        resp = self.client.post(f"/api/domain/invite/accept/{token}/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data["detail"], "token_invalid")
        self.assertFalse(self.domain.members.filter(pk=self.invited.pk).exists())
