from unittest.mock import patch

from django.test import TestCase

from core.mailers import send_password_reset_email, send_quiz_assignment_email
from core.models import OutboundEmail
from customuser.models import CustomUser
from domain.models import Domain
from quiz.models import Quiz, QuizTemplate


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
        self.assertEqual(outbound.subject, "WpRef - password reset")

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

    def test_password_reset_email_uses_recipient_language(self):
        user = CustomUser.objects.create_user(
            username="mail-user-nl",
            password="Pass1234!",
            email="mail-user-nl@example.com",
            language="nl",
        )

        send_password_reset_email(user)

        outbound = OutboundEmail.objects.order_by("-id").first()
        self.assertEqual(outbound.subject, "WpRef - wachtwoord opnieuw instellen")
        self.assertIn("Hallo", outbound.body)

    def test_quiz_assignment_email_localizes_subject_and_deadline(self):
        owner = CustomUser.objects.create_user(username="owner", password="Pass1234!")
        user = CustomUser.objects.create_user(
            username="quiz-user",
            password="Pass1234!",
            email="quiz-user@example.com",
            language="fr",
        )
        domain = Domain.objects.create(owner=owner, name="Domaine", description="", active=True)
        template = QuizTemplate.objects.create(
            domain=domain,
            title="Quiz FR",
            permanent=True,
            active=True,
            created_by=owner,
        )
        quiz = Quiz.objects.create(quiz_template=template, user=user, active=True)

        send_quiz_assignment_email(quiz)

        outbound = OutboundEmail.objects.order_by("-id").first()
        self.assertEqual(outbound.subject, "WpRef - nouveau quiz a completer")
        self.assertIn("Bonjour", outbound.body)
        self.assertIn("Lien", outbound.body)
