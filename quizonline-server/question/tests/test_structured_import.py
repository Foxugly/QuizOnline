from django.contrib.auth import get_user_model
from django.test import TestCase

from language.models import Language
from question.structured_import import StructuredImportError, import_questions

User = get_user_model()


class StructuredImportDomainLanguagesTests(TestCase):
    def setUp(self):
        self.superuser = User.objects.create_superuser(
            username="import-admin",
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

    def test_import_created_domain_inherits_languages_declared_in_file(self):
        payload = self._base_payload()

        result = import_questions(payload, self.superuser)

        self.assertTrue(result["domain_created"])
        domain = self.superuser.owned_domains.get(pk=result["domain_id"])
        self.assertEqual(
            sorted(domain.allowed_languages.values_list("code", flat=True)),
            ["en", "fr", "nl"],
        )

    def test_import_rejects_domain_creation_when_import_language_is_unknown(self):
        payload = self._base_payload()
        payload["questions"][0]["translations"]["es"] = {
            "title": "Pregunta ES",
            "description": "",
            "explanation": "",
        }

        with self.assertRaises(StructuredImportError) as ctx:
            import_questions(payload, self.superuser)

        self.assertIn("Langues introuvables", str(ctx.exception))
        self.assertIn("es", str(ctx.exception))
        self.assertEqual(self.superuser.owned_domains.count(), 0)
