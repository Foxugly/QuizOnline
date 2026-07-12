"""
Tests for the domain-ownership-transfer flow:

- ``POST /api/domain/{id}/transfer/`` (owner-only, queues a signed mail)
- ``GET/POST /api/domain/transfer/accept/<token>/`` (public-GET,
  authenticated-POST)
"""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import translation
from rest_framework import status
from rest_framework.test import APIClient

from core.models import OutboundEmail
from domain.models import Domain, DomainAuditLog
from domain.transfer_token import make_transfer_token

User = get_user_model()


class TransferInitiateTests(TestCase):
    URL = "/api/domain/{}/transfer/"

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(password="p", email="o@x.test")
        self.future = User.objects.create_user(password="p", email="f@x.test")
        self.manager = User.objects.create_user(password="p", email="m@x.test")
        self.domain = Domain.objects.create(owner=self.owner, name="D", active=True)
        self.domain.managers.add(self.manager)
        self.client = APIClient()

    def test_requires_authentication(self):
        resp = self.client.post(self.URL.format(self.domain.id), {"user_id": self.future.id}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_manager_cannot_transfer(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post(self.URL.format(self.domain.id), {"user_id": self.future.id}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_initiates_transfer_queues_email(self):
        OutboundEmail.objects.all().delete()
        self.client.force_authenticate(self.owner)
        resp = self.client.post(self.URL.format(self.domain.id), {"user_id": self.future.id}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(OutboundEmail.objects.count(), 1)
        outbound = OutboundEmail.objects.first()
        self.assertIn(self.future.email, outbound.recipients)
        self.assertIn("/transfer/accept/", outbound.body)
        # Ownership is NOT yet transferred — only the proposal was sent.
        self.domain.refresh_from_db()
        self.assertEqual(self.domain.owner_id, self.owner.id)

    def test_cannot_transfer_to_current_owner(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.post(self.URL.format(self.domain.id), {"user_id": self.owner.id}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)

    def test_pending_transfer_surfaces_in_detail(self):
        """After the owner initiates a transfer the domain detail
        endpoint should expose ``pending_transfer = {id, name}``
        so the frontend can show "transfer in flight" on /edit."""
        self.client.force_authenticate(self.owner)
        # Detail before: no pending transfer.
        before = self.client.get(f"/api/domain/{self.domain.id}/details/")
        self.assertEqual(before.status_code, status.HTTP_200_OK)
        self.assertIsNone(before.data["pending_transfer"])

        # Initiate.
        self.client.post(
            self.URL.format(self.domain.id),
            {"user_id": self.future.id},
            format="json",
        )

        after = self.client.get(f"/api/domain/{self.domain.id}/details/")
        self.assertEqual(after.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(after.data["pending_transfer"])
        self.assertEqual(after.data["pending_transfer"]["id"], self.future.id)
        self.assertEqual(after.data["pending_transfer"]["name"], self.future.get_display_name())

    def test_pending_transfer_cleared_after_accept(self):
        """Once the future owner has accepted, ``pending_transfer``
        flips back to ``null`` even though the initiate audit row
        is still on the table."""
        from domain.models import DomainAuditLog
        # Seed the initiate row directly (skip the email queueing).
        DomainAuditLog.objects.create(
            domain=self.domain,
            actor=self.owner,
            target_user=self.future,
            action="transfer.initiate",
            metadata={},
        )
        DomainAuditLog.objects.create(
            domain=self.domain,
            actor=self.future,
            target_user=self.future,
            action="transfer.accept",
            metadata={},
        )
        self.client.force_authenticate(self.owner)
        resp = self.client.get(f"/api/domain/{self.domain.id}/details/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNone(resp.data["pending_transfer"])

    def test_future_owner_without_email_refused(self):
        self.future.email = ""
        self.future.save(update_fields=["email"])
        self.client.force_authenticate(self.owner)
        resp = self.client.post(self.URL.format(self.domain.id), {"user_id": self.future.id}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class TransferAcceptTests(TestCase):
    URL = "/api/domain/transfer/accept/{}/"

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(password="p", email="o@x.test")
        self.future = User.objects.create_user(password="p", email="f@x.test")
        self.domain = Domain.objects.create(owner=self.owner, name="D", active=True)
        self.client = APIClient()

    def _token(self, *, domain=None, future=None, initiator=None) -> str:
        return make_transfer_token(
            domain_id=(domain or self.domain).id,
            future_owner_id=(future or self.future).id,
            initiator_id=(initiator or self.owner).id,
        )

    def test_get_anonymous_returns_wrong_account_for_inspection(self):
        token = self._token()
        resp = self.client.get(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Anonymous visitor: not the future owner → ``wrong_account``,
        # the frontend uses this signal to bounce to login.
        self.assertEqual(resp.data["state"], "wrong_account")

    def test_get_future_owner_ready_to_accept(self):
        self.client.force_authenticate(self.future)
        token = self._token()
        resp = self.client.get(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["state"], "ready_to_accept")

    def test_post_transfers_ownership(self):
        self.client.force_authenticate(self.future)
        token = self._token()
        resp = self.client.post(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["state"], "transferred")
        self.domain.refresh_from_db()
        self.assertEqual(self.domain.owner_id, self.future.id)
        # Old owner is kept as a member so they retain access to their content.
        self.assertTrue(self.domain.members.filter(pk=self.owner.pk).exists())
        # New owner is also a manager.
        self.assertTrue(self.domain.managers.filter(pk=self.future.pk).exists())
        self.assertTrue(
            DomainAuditLog.objects.filter(action="transfer.accept", actor=self.future).exists()
        )

    def test_post_wrong_account_refused(self):
        other = User.objects.create_user(password="p", email="other@x.test")
        self.client.force_authenticate(other)
        token = self._token()
        resp = self.client.post(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.domain.refresh_from_db()
        self.assertEqual(self.domain.owner_id, self.owner.id)

    def test_no_longer_eligible_when_owner_changed(self):
        # Owner changes after the token was minted: original initiator
        # is no longer the current owner → refusal.
        third = User.objects.create_user(password="p", email="t@x.test")
        token = self._token()
        self.domain.owner = third
        self.domain.save(update_fields=["owner"])
        self.client.force_authenticate(self.future)
        resp = self.client.post(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["state"], "no_longer_eligible")
        self.domain.refresh_from_db()
        self.assertEqual(self.domain.owner_id, third.id)

    def test_expired_token(self):
        with patch("django.core.signing.time") as mock_time:
            mock_time.time.return_value = 1_000_000
            token = self._token()
            mock_time.time.return_value = 1_000_000 + 10 * 24 * 3600
            self.client.force_authenticate(self.future)
            resp = self.client.get(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_410_GONE)

    def test_invalid_token(self):
        resp = self.client.get(self.URL.format("garbage"))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
