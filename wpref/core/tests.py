from unittest.mock import patch

from django.test import TestCase

from core.mailers import send_password_reset_email
from core.models import OutboundEmail
from customuser.models import CustomUser


class CoreMailerTests(TestCase):
    def test_send_password_reset_email_enqueues_outbound_email(self):
        user = CustomUser.objects.create_user(
            username="mail-user",
            password="Pass1234!",
            email="mail-user@example.com",
        )

        send_password_reset_email(user)

        outbound = OutboundEmail.objects.get()
        self.assertEqual(outbound.recipients, ["mail-user@example.com"])
        self.assertIn("reinitialisation du mot de passe", outbound.subject.lower())

    @patch("core.mailers._common.transaction.on_commit")
    def test_send_password_reset_email_registers_automatic_delivery(self, on_commit):
        user = CustomUser.objects.create_user(
            username="mail-user-2",
            password="Pass1234!",
            email="mail-user-2@example.com",
        )

        send_password_reset_email(user)

        self.assertTrue(OutboundEmail.objects.filter(recipients=["mail-user-2@example.com"]).exists())
        on_commit.assert_called_once()
