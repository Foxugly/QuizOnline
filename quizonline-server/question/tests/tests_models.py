from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase
from unittest.mock import patch

from question.models import (
    Question,
    QuestionSubject,
    AnswerOption,
)
from domain.models import Domain
from subject.models import Subject

from language.models import Language

User = get_user_model()

class QuestionModelsTestCase(TestCase):

    @classmethod
    def setUpTestData(cls):
        # ---------- User ----------
        cls.owner = User.objects.create_user(
            username="owner",
            email="owner@test.com",
            password="pass",
        )

        # ---------- Languages ----------
        cls.lang_fr = Language.objects.create(code="fr")
        cls.lang_en = Language.objects.create(code="en")

        # ---------- Domain ----------
        cls.domain = Domain.objects.create(owner=cls.owner)
        cls.domain.allowed_languages.set([cls.lang_fr, cls.lang_en])

        cls.domain.set_current_language("fr")
        cls.domain.name = "Domaine FR"
        cls.domain.description = "Description FR"
        cls.domain.save()

        # ---------- Subject ----------
        cls.subject = Subject.objects.create(domain=cls.domain, active=True)

        cls.subject.set_current_language("fr")
        cls.subject.name = "Sujet FR"
        cls.subject.description = "Description Sujet FR"
        cls.subject.save()

    # ==========================================================
    # Question
    # ==========================================================

    def test_question_str_with_translation(self):
        q = Question.objects.create(domain=self.domain)
        q.set_current_language("fr")
        q.title = "Question FR"
        q.save()

        self.assertEqual(str(q), "Question FR")

    def test_question_str_with_existing_translation(self):
        q = Question.objects.create(domain=self.domain)

        q.set_current_language("fr")
        q.title = "Question FR"
        q.save()

        self.assertEqual(str(q), "Question FR")

    def test_question_str_without_translation(self):
        q = Question.objects.create(domain=self.domain)
        q._parler_meta.root_model.objects.filter(master=q).update(title="")

        with patch.object(q, "safe_translation_getter", return_value=None):
            self.assertEqual(str(q), f"Question#{q.pk}")

    # ==========================================================
    # QuestionSubject
    # ==========================================================

    def test_question_subject_unique_constraint(self):
        q = Question.objects.create(domain=self.domain)
        QuestionSubject.objects.create(question=q, subject=self.subject)

        with self.assertRaises(IntegrityError):
            QuestionSubject.objects.create(question=q, subject=self.subject)

    def test_question_subject_str(self):
        q = Question.objects.create(domain=self.domain)
        qs = QuestionSubject.objects.create(
            question=q,
            subject=self.subject,
            sort_order=3,
        )
        s = str(qs)
        self.assertIn("Q", s)
        self.assertIn("ord:3", s)

    # ==========================================================
    # AnswerOption
    # ==========================================================

    def test_answer_option_str_correct(self):
        q = Question.objects.create(domain=self.domain)
        ao = AnswerOption.objects.create(
            question=q,
            is_correct=True,
            sort_order=1,
        )
        # Phase 3 LMS refactor: AnswerOption no longer carries a parler
        # ``content`` field — multilingual content moved to block rows.
        self.assertIn("✔", str(ao))

    def test_answer_option_str_incorrect(self):
        q = Question.objects.create(domain=self.domain)
        ao = AnswerOption.objects.create(
            question=q,
            is_correct=False,
            sort_order=2,
        )
        self.assertIn("✗", str(ao))
