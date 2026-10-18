"""Auth-token hardening.

- E-mail confirmation tokens come from a dedicated generator (own salt, hash
  includes ``email_confirmed``): they are not password-reset tokens and stop
  working once the address is confirmed.
- Magic links are single-use and die with a password change.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.test import TestCase
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient

from customuser.magic_link_token import make_magic_link_token
from customuser.tokens import email_confirmation_token_generator

User = get_user_model()

RESET_CONFIRM_URL = "/api/v1/user/password/reset/confirm/"
EMAIL_CONFIRM_URL = "/api/v1/user/email/confirm/"
MAGIC_EXCHANGE_URL = "/api/v1/auth/magic-link/exchange/"
NEW_PW = "NewPass123!Aa-Zz"


class EmailConfirmationTokenTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email="bob@x.test", password="Old-Pass-123!")
        self.uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        self.client = APIClient()

    def test_confirmation_token_is_not_a_password_reset_token(self):
        token = email_confirmation_token_generator.make_token(self.user)
        res = self.client.post(
            RESET_CONFIRM_URL,
            {"uid": self.uid, "token": token, "new_password1": NEW_PW, "new_password2": NEW_PW},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.check_password(NEW_PW))

    def test_password_reset_token_does_not_confirm_email(self):
        token = default_token_generator.make_token(self.user)
        res = self.client.post(EMAIL_CONFIRM_URL, {"uid": self.uid, "token": token}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.email_confirmed)

    def test_confirmation_token_is_single_use(self):
        token = email_confirmation_token_generator.make_token(self.user)
        first = self.client.post(EMAIL_CONFIRM_URL, {"uid": self.uid, "token": token}, format="json")
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        second = self.client.post(EMAIL_CONFIRM_URL, {"uid": self.uid, "token": token}, format="json")
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_registration_mail_uses_confirmation_generator(self):
        from core.mailers.registration import (
            send_registration_confirmation_email,
        )
        from core.models import OutboundEmail

        OutboundEmail.objects.all().delete()
        send_registration_confirmation_email(self.user)
        body = OutboundEmail.objects.get().body
        token = body.split("/user/confirm-email/")[1].split("/")[1].split()[0].strip()
        self.assertTrue(email_confirmation_token_generator.check_token(self.user, token))
        self.assertFalse(default_token_generator.check_token(self.user, token))


class MagicLinkSingleUseTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email="carol@x.test", password="Old-Pass-123!")
        self.user.email_confirmed = True
        self.user.save(update_fields=["email_confirmed"])
        self.client = APIClient()

    def test_magic_link_cannot_be_replayed(self):
        token = make_magic_link_token(self.user)
        first = self.client.post(MAGIC_EXCHANGE_URL, {"token": token}, format="json")
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        second = self.client.post(MAGIC_EXCHANGE_URL, {"token": token}, format="json")
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_exchange_updates_last_login(self):
        self.assertIsNone(self.user.last_login)
        token = make_magic_link_token(self.user)
        self.client.post(MAGIC_EXCHANGE_URL, {"token": token}, format="json")
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.last_login)

    def test_password_change_invalidates_magic_link(self):
        token = make_magic_link_token(self.user)
        self.user.set_password(NEW_PW)
        self.user.save(update_fields=["password"])
        res = self.client.post(MAGIC_EXCHANGE_URL, {"token": token}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
