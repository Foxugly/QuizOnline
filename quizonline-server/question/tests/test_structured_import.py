from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from domain.models import Domain
from language.models import Language
from question.structured_import import (
    StructuredImportError,
    StructuredImportPermissionError,
    import_questions,
)

User = get_user_model()


class StructuredImportDomainLanguagesTests(TestCase):
    def setUp(self):
        self.superuser = User.objects.create_superuser(
            email="import-admin@example.com",
            password="secret123",
        )
        Language.objects.create(code="fr", name="Francais", active=True)
        Language.objects.create(code="en", name="English", active=True)
        Language.objects.create(code="nl", name="Nederlands", active=True)

    def _base_payload(self):
        return {
            "version": "1.0",
            "domain": {
                "id": 10,
                "translations": {
                    "fr": {"name": "Domaine FR", "description": "Description FR"},
                    "en": {"name": "Domain EN", "description": "Description EN"},
                },
            },
            "subjects": [
                {
                    "id": 20,
                    "translations": {
                        "en": {"name": "Subject EN"},
                    },
                }
            ],
            "questions": [
                {
                    "id": 30,
                    "domain_id": 10,
                    "subject_ids": [20],
                    "active": True,
                    "allow_multiple_correct": False,
                    "is_mode_practice": True,
                    "is_mode_exam": False,
                    "translations": {
                        "nl": {
                            "title": "Vraag NL",
                            "description": "",
                            "explanation": "",
                        }
                    },
                    "answer_options": [
                        {
                            "id": 40,
                            "is_correct": True,
                            "sort_order": 1,
                            "translations": {
                                "fr": {"content": "Bonne reponse"},
                                "en": {"content": "Correct answer"},
                            },
                        },
                        {
                            "id": 41,
                            "is_correct": False,
                            "sort_order": 2,
                            "translations": {
                                "fr": {"content": "Mauvaise reponse"},
                                "en": {"content": "Wrong answer"},
                            },
                        },
                    ],
                }
            ],
        }

    def test_import_created_domain_uses_only_domain_translation_languages(self):
        """allowed_languages = only langs from domain translations, not from the whole payload."""
        payload = self._base_payload()

        result = import_questions(payload, self.superuser)

        self.assertTrue(result["domain_created"])
        domain = Domain.objects.get(pk=result["domain_id"])
        self.assertEqual(
            sorted(domain.allowed_languages.values_list("code", flat=True)),
            ["en", "fr"],
        )

    def test_import_created_domain_adds_user_as_member(self):
        """The importing user is added as a member of the newly created domain."""
        payload = self._base_payload()

        result = import_questions(payload, self.superuser)

        domain = Domain.objects.get(pk=result["domain_id"])
        self.assertIn(self.superuser, domain.members.all())
        self.assertEqual(domain.owner, self.superuser)

    def test_import_rejects_domain_creation_when_domain_language_is_unknown(self):
        """Error when a domain translation references a language not in the Language table."""
        payload = self._base_payload()
        payload["domain"]["translations"]["es"] = {
            "name": "Dominio ES",
            "description": "",
        }

        with self.assertRaises(StructuredImportError) as ctx:
            import_questions(payload, self.superuser)

        self.assertIn("Langues introuvables", str(ctx.exception))
        self.assertIn("es", str(ctx.exception))
        self.assertEqual(self.superuser.owned_domains.count(), 0)


class StructuredImportViewErrorTests(APITestCase):
    URL = "/api/v1/question/import-structured/"

    def setUp(self):
        self.superuser = User.objects.create_superuser(
            email="import-view-admin@example.com",
            password="secret123",
        )
        self.client.force_authenticate(user=self.superuser)

    def test_invalid_json_file_returns_stable_message_and_logs_parser_error(self):
        upload = SimpleUploadedFile("bad.json", b'{"version": ', content_type="application/json")

        with self.assertLogs("question.views", level="INFO") as logs:
            response = self.client.post(self.URL, {"json_file": upload}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Fichier JSON invalide.")
        self.assertIn("Expecting value", "\n".join(logs.output))

    def test_import_error_returns_its_user_message(self):
        with (
            patch("question.views.import_questions", side_effect=StructuredImportError("Clé 'domain' manquante.")),
            self.assertLogs("question.views", level="INFO") as logs,
        ):
            response = self.client.post(self.URL, {"version": "1.0"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Clé 'domain' manquante.")
        self.assertIn("rejected", "\n".join(logs.output))

    def test_permission_error_returns_403_with_its_user_message(self):
        with (
            patch(
                "question.views.import_questions",
                side_effect=StructuredImportPermissionError("Seul un superutilisateur peut créer un domaine."),
            ),
            self.assertLogs("question.views", level="INFO"),
        ):
            response = self.client.post(self.URL, {"version": "1.0"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "Seul un superutilisateur peut créer un domaine.")

    def test_unexpected_error_returns_generic_500_without_exception_text(self):
        with (
            patch("question.views.import_questions", side_effect=RuntimeError("internal secret-detail")),
            self.assertLogs("question.views", level="ERROR") as logs,
        ):
            response = self.client.post(self.URL, {"version": "1.0"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertNotIn("secret-detail", str(response.data))
        self.assertIn("secret-detail", "\n".join(logs.output))
