"""
Tests for the public moderation endpoint reached from email accept/reject
links: ``/api/domain/join-request/decide/<token>/``.

Covers:
- The token must verify, point at a real request, and authenticate the
  recipient that the token was minted for.
- GET only reads state (and reports ``was_already_decided``).
- POST executes the encoded action, including the override case where a
  later mail click overturns a prior decision.
- Moderators who lost their seat after the mail was sent cannot reuse
  the token.
"""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import translation
from rest_framework import status
from rest_framework.test import APIClient

from domain.decision_token import make_decision_token
from domain.models import Domain, DomainJoinRequest, JoinPolicy

User = get_user_model()


class DomainJoinRequestDecideEndpointTests(TestCase):
    URL = "/api/domain/join-request/decide/{}/"

    def setUp(self):
        translation.activate("fr")
        self.owner = User.objects.create_user(username="owner", password="pwd", email="owner@x.test")
        self.manager = User.objects.create_user(username="mgr", password="pwd", email="mgr@x.test")
        self.requester = User.objects.create_user(username="req", password="pwd", email="req@x.test")
        self.other = User.objects.create_user(username="other", password="pwd", email="other@x.test")

        self.domain = Domain.objects.create(
            owner=self.owner,
            name="D",
            active=True,
            join_policy=JoinPolicy.OWNER_MANAGERS,
        )
        self.domain.managers.add(self.manager)

        self.join_request = DomainJoinRequest.objects.create(
            domain=self.domain,
            user=self.requester,
            status=DomainJoinRequest.STATUS_PENDING,
        )

        self.client = APIClient()

    def _token(self, *, recipient, action):
        return make_decision_token(
            request_id=self.join_request.id,
            recipient_user_id=recipient.id,
            action=action,
        )

    # ---- GET ----------------------------------------------------------

    def test_get_requires_authentication(self):
        token = self._token(recipient=self.owner, action="approve")
        resp = self.client.get(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_returns_state_for_pending_request(self):
        token = self._token(recipient=self.owner, action="approve")
        self.client.force_authenticate(self.owner)
        resp = self.client.get(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["action"], "approve")
        self.assertFalse(resp.data["was_already_decided"])
        self.assertEqual(resp.data["request"]["id"], self.join_request.id)

    def test_get_flags_was_already_decided(self):
        self.join_request.status = DomainJoinRequest.STATUS_APPROVED
        self.join_request.decided_by = self.owner
        self.join_request.save()
        token = self._token(recipient=self.manager, action="reject")
        self.client.force_authenticate(self.manager)
        resp = self.client.get(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["was_already_decided"])

    def test_get_rejects_wrong_user(self):
        # Token was minted for the owner, ``other`` tries to use it.
        token = self._token(recipient=self.owner, action="approve")
        self.client.force_authenticate(self.other)
        resp = self.client.get(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(resp.data["detail"], "token_recipient_mismatch")

    def test_get_rejects_invalid_token(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.get(self.URL.format("garbage"))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data["detail"], "token_invalid")

    def test_get_rejects_expired_token(self):
        with patch("django.core.signing.time") as mock_time:
            mock_time.time.return_value = 1_000_000
            token = self._token(recipient=self.owner, action="approve")
            mock_time.time.return_value = 1_000_000 + 10 * 24 * 3600  # 10 days
            self.client.force_authenticate(self.owner)
            resp = self.client.get(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_410_GONE)
        self.assertEqual(resp.data["detail"], "token_expired")

    def test_get_rejects_moderator_who_lost_seat(self):
        # Manager loses their seat after the mail went out: token is still
        # cryptographically valid but they can no longer moderate.
        self.domain.managers.remove(self.manager)
        token = self._token(recipient=self.manager, action="approve")
        self.client.force_authenticate(self.manager)
        resp = self.client.get(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(resp.data["detail"], "cannot_approve_anymore")

    def test_get_returns_404_for_unknown_request_id(self):
        token = make_decision_token(
            request_id=999_999,
            recipient_user_id=self.owner.id,
            action="approve",
        )
        self.client.force_authenticate(self.owner)
        resp = self.client.get(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    # ---- POST ---------------------------------------------------------

    def test_post_approves_pending_request(self):
        token = self._token(recipient=self.owner, action="approve")
        self.client.force_authenticate(self.owner)
        resp = self.client.post(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.join_request.refresh_from_db()
        self.assertEqual(self.join_request.status, DomainJoinRequest.STATUS_APPROVED)
        self.assertEqual(self.join_request.decided_by_id, self.owner.id)
        self.assertTrue(self.domain.members.filter(pk=self.requester.pk).exists())
        self.assertFalse(resp.data["was_already_decided"])

    def test_post_rejects_pending_request(self):
        token = self._token(recipient=self.manager, action="reject")
        self.client.force_authenticate(self.manager)
        resp = self.client.post(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.join_request.refresh_from_db()
        self.assertEqual(self.join_request.status, DomainJoinRequest.STATUS_REJECTED)
        self.assertFalse(self.domain.members.filter(pk=self.requester.pk).exists())

    def test_post_override_reject_after_approve_removes_membership(self):
        # First mail click approves.
        approve_token = self._token(recipient=self.owner, action="approve")
        self.client.force_authenticate(self.owner)
        self.client.post(self.URL.format(approve_token))
        self.assertTrue(self.domain.members.filter(pk=self.requester.pk).exists())

        # Second mail click (by the manager) rejects -- last decision wins,
        # and the requester must be taken out of ``members`` to keep the
        # row's status consistent with the domain membership.
        reject_token = self._token(recipient=self.manager, action="reject")
        self.client.force_authenticate(self.manager)
        resp = self.client.post(self.URL.format(reject_token))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["was_already_decided"])
        self.join_request.refresh_from_db()
        self.assertEqual(self.join_request.status, DomainJoinRequest.STATUS_REJECTED)
        self.assertFalse(self.domain.members.filter(pk=self.requester.pk).exists())

    def test_post_rejects_wrong_user(self):
        token = self._token(recipient=self.owner, action="approve")
        self.client.force_authenticate(self.other)
        resp = self.client.post(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        # Side-effect-free: the row stays pending.
        self.join_request.refresh_from_db()
        self.assertEqual(self.join_request.status, DomainJoinRequest.STATUS_PENDING)

    def test_post_rejects_expired_token(self):
        with patch("django.core.signing.time") as mock_time:
            mock_time.time.return_value = 1_000_000
            token = self._token(recipient=self.owner, action="approve")
            mock_time.time.return_value = 1_000_000 + 10 * 24 * 3600
            self.client.force_authenticate(self.owner)
            resp = self.client.post(self.URL.format(token))
        self.assertEqual(resp.status_code, status.HTTP_410_GONE)
        self.join_request.refresh_from_db()
        self.assertEqual(self.join_request.status, DomainJoinRequest.STATUS_PENDING)
