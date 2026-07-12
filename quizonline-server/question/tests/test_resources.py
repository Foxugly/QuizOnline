from django.contrib.auth import get_user_model
from django.test import TestCase
from tablib import Dataset

from domain.models import Domain
from language.models import Language
from question.models import AnswerOption, Question
from question.resources import AnswerOptionResource


User = get_user_model()


class AnswerOptionResourceTestCase(TestCase):
    """Phase 3 LMS refactor: AnswerOption is no longer parler-translated
    (its multilingual ``content`` moved to polymorphic block rows). The
    import/export resource now only round-trips the structural columns
    — block content travels through the structured-JSON exporter
    instead. These tests cover the new contract.
    """

    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user(
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

    def test_export_includes_structural_columns(self):
        option = AnswerOption.objects.create(
            question=self.question,
            is_correct=True,
            sort_order=1,
        )

        dataset = AnswerOptionResource().export()

        self.assertIn("id", dataset.headers)
        self.assertIn("question", dataset.headers)
        self.assertIn("is_correct", dataset.headers)
        self.assertIn("sort_order", dataset.headers)
        # Translated columns are gone after Phase 3.
        self.assertNotIn("content_fr", dataset.headers)
        self.assertNotIn("content_en", dataset.headers)
        row = next(r for r in dataset.dict if str(r["id"]) == str(option.pk))
        self.assertEqual(str(row["sort_order"]), "1")

    def test_import_creates_option_row(self):
        resource = AnswerOptionResource()
        dataset = Dataset(
            headers=("id", "question", "is_correct", "sort_order"),
        )
        dataset.append((101, self.question.id, True, 2))

        result = resource.import_data(dataset, dry_run=False)

        self.assertFalse(result.has_errors())

        option = AnswerOption.objects.get(pk=101)
        self.assertTrue(option.is_correct)
        self.assertEqual(option.sort_order, 2)
