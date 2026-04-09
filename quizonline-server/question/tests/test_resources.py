from django.contrib.auth import get_user_model
from django.test import TestCase
from tablib import Dataset

from domain.models import Domain
from language.models import Language
from question.models import AnswerOption, Question
from question.resources import AnswerOptionResource


User = get_user_model()


class AnswerOptionResourceTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user(
            username="owner",
            email="owner@test.com",
            password="pass",
        )
        cls.lang_fr = Language.objects.create(code="fr")
        cls.lang_en = Language.objects.create(code="en")

        cls.domain = Domain.objects.create(owner=cls.owner)
        cls.domain.allowed_languages.set([cls.lang_fr, cls.lang_en])

        cls.question = Question.objects.create(domain=cls.domain)
        cls.question.set_current_language("fr")
        cls.question.title = "Question FR"
        cls.question.save()

    def test_export_includes_translated_content_columns(self):
        option = AnswerOption.objects.create(
            question=self.question,
            is_correct=True,
            sort_order=1,
        )
        option.set_current_language("fr")
        option.content = "Bonne reponse"
        option.save()
        option.set_current_language("en")
        option.content = "Correct answer"
        option.save()

        dataset = AnswerOptionResource().export()

        self.assertIn("content_fr", dataset.headers)
        self.assertIn("content_en", dataset.headers)
        self.assertEqual(dataset.dict[0]["content_fr"], "Bonne reponse")
        self.assertEqual(dataset.dict[0]["content_en"], "Correct answer")

    def test_import_creates_translations(self):
        resource = AnswerOptionResource()
        dataset = Dataset(
            headers=("id", "question", "is_correct", "sort_order", "content_fr", "content_en")
        )
        dataset.append((101, self.question.id, True, 2, "Oui", "Yes"))

        result = resource.import_data(dataset, dry_run=False)

        self.assertFalse(result.has_errors())

        option = AnswerOption.objects.get(pk=101)
        self.assertTrue(option.is_correct)
        self.assertEqual(option.sort_order, 2)
        self.assertEqual(
            option.safe_translation_getter("content", language_code="fr", any_language=False),
            "Oui",
        )
        self.assertEqual(
            option.safe_translation_getter("content", language_code="en", any_language=False),
            "Yes",
        )
