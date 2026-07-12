"""
Tests for the passwordless magic-link sign-in flow:

- ``POST /api/auth/magic-link/request/`` (always 200, ungrammatical
  per-account leakage forbidden)
- ``POST /api/auth/magic-link/exchange/`` (token → JWT pair)
"""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.utils import translation
from rest_framework import status
from rest_framework.test import APIClient

from core.models import OutboundEmail
from customuser.magic_link_token import make_magic_link_token

User = get_user_model()


def _reset_throttles():
    """Clear DRF throttle counters between tests so the 3/hour cap on the
    request endpoint does not bleed across cases."""
    cache.clear()


class MagicLinkRequestTests(TestCase):
    URL = "/api/auth/magic-link/request/"

    def setUp(self):
        translation.activate("fr")
        _reset_throttles()
        self.user = User.objects.create_user(
            password="pwd", email="alice@x.test",
        )
        self.user.email_confirmed = True
        self.user.save(update_fields=["email_confirmed"])
        self.client = APIClient()

    def test_known_email_queues_mail(self):
        OutboundEmail.objects.all().delete()
        resp = self.client.post(self.URL, {"email": "alice@x.test"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(OutboundEmail.objects.count(), 1)
        outbound = OutboundEmail.objects.first()
        self.assertIn("/auth/magic/", outbound.body)

    def test_unknown_email_returns_same_response(self):
        OutboundEmail.objects.all().delete()
        resp = self.client.post(self.URL, {"email": "ghost@x.test"}, format="json")
        # Same status + same body shape — must not leak existence.
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(OutboundEmail.objects.count(), 0)

    def test_inactive_user_does_not_get_mail(self):
        OutboundEmail.objects.all().delete()
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        resp = self.client.post(self.URL, {"email": "alice@x.test"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(OutboundEmail.objects.count(), 0)

    def test_unconfirmed_email_does_not_get_mail(self):
        OutboundEmail.objects.all().delete()
        self.user.email_confirmed = False
        self.user.save(update_fields=["email_confirmed"])
        resp = self.client.post(self.URL, {"email": "alice@x.test"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(OutboundEmail.objects.count(), 0)

    def test_malformed_email_returns_400(self):
        resp = self.client.post(self.URL, {"email": "not-an-email"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class MagicLinkExchangeTests(TestCase):
    URL = "/api/auth/magic-link/exchange/"

    def setUp(self):
        translation.activate("fr")
        _reset_throttles()
        self.user = User.objects.create_user(
            password="pwd", email="alice@x.test",
        )
        self.user.email_confirmed = True
        self.user.save(update_fields=["email_confirmed"])
        self.client = APIClient()

    def test_valid_token_returns_jwt_pair(self):
        token = make_magic_link_token(user_id=self.user.id)
        resp = self.client.post(self.URL, {"token": token}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)
        self.assertIn("refresh", resp.data)
        self.assertTrue(resp.data["access"])
        self.assertTrue(resp.data["refresh"])

    def test_invalid_token_400(self):
        resp = self.client.post(self.URL, {"token": "garbage"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data["detail"], "token_invalid")

    def test_expired_token_410(self):
        with patch("django.core.signing.time") as mock_time:
            mock_time.time.return_value = 1_000_000
            token = make_magic_link_token(user_id=self.user.id)
            mock_time.time.return_value = 1_000_000 + 16 * 60  # 16 minutes
            resp = self.client.post(self.URL, {"token": token}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_410_GONE)

    def test_deactivated_user_token_is_refused(self):
        token = make_magic_link_token(user_id=self.user.id)
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        resp = self.client.post(self.URL, {"token": token}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        # Same generic shape as for malformed tokens — never disclose
        # the precise cause.
        self.assertEqual(resp.data["detail"], "token_invalid")

    def test_unknown_user_id_token_is_refused(self):
        token = make_magic_link_token(user_id=999_999)
        resp = self.client.post(self.URL, {"token": token}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data["detail"], "token_invalid")
