# subject/tests/tests_serializers.py
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from django.utils import translation
from rest_framework import serializers

from domain.models import Domain
from language.models import Language
from subject.models import Subject

from question.models import (
    Question,
    AnswerOption,
)
from question.serializers import (
    QuestionLiteSerializer,
    QuestionAnswerOptionPublicReadSerializer,
    QuestionAnswerOptionReadSerializer,
    QuestionAnswerOptionWriteSerializer,
    QuestionInQuizQuestionSerializer,
    QuestionReadSerializer,
    QuestionWriteSerializer,
)
from question.answer_option_sync import sync_question_answer_options

User = get_user_model()


class QuestionSerializersTestCase(TestCase):
    """
    Tests stables:
    - aucun état mutable partagé entre tests (pas de setUpTestData pour Domain/Subject/Question)
    - création Parler robuste (initialize=True) + refresh DB
    - langue Django reset à chaque test
    """

    # ---------------------------------------------------------------------
    # Setup
    # ---------------------------------------------------------------------
    def setUp(self):
        translation.activate("fr")

        # Users
        self.owner = User.objects.create_user(email="owner@example.test", password="pwd")
        self.staff = User.objects.create_user(email="staff@example.test", password="pwd", is_staff=True)
        self.outsider = User.objects.create_user(email="outsider@example.test", password="pwd")

        # Languages (doivent correspondre à settings.LANGUAGES)
        self.lang_fr = Language.objects.create(code="fr", name="Français", active=True)
        self.lang_en = Language.objects.create(code="en", name="English", active=True)

        # Domain + allowed languages
        self.domain = Domain.objects.create(active=True, owner=self.owner)
        self.domain.allowed_languages.set([self.lang_fr, self.lang_en])
        self._set_parler_translation(self.domain, "fr", name="Domaine FR", description="")
        self._set_parler_translation(self.domain, "en", name="Domain EN", description="")

        self.other_domain = Domain.objects.create(active=True, owner=self.owner)
        self.other_domain.allowed_languages.set([self.lang_fr, self.lang_en])
        self._set_parler_translation(self.other_domain, "fr", name="Autre domaine FR", description="")
        self._set_parler_translation(self.other_domain, "en", name="Other domain EN", description="")

        # Subjects
        self.subj1 = Subject.objects.create(domain=self.domain, active=True)
        self._set_parler_translation(self.subj1, "fr", name="Sujet 1 FR", description="")
        self._set_parler_translation(self.subj1, "en", name="Subject 1 EN", description="")

        self.subj2 = Subject.objects.create(domain=self.domain, active=True)
        self._set_parler_translation(self.subj2, "fr", name="Sujet 2 FR", description="")
        self._set_parler_translation(self.subj2, "en", name="Subject 2 EN", description="")

        self.other_subj = Subject.objects.create(domain=self.other_domain, active=True)
        self._set_parler_translation(self.other_subj, "fr", name="Sujet autre FR", description="")
        self._set_parler_translation(self.other_subj, "en", name="Other subject EN", description="")

        # Refetch "clean" (évite caches parler)
        self.domain = Domain.objects.get(pk=self.domain.pk)
        self.other_domain = Domain.objects.get(pk=self.other_domain.pk)
        self.subj1 = Subject.objects.get(pk=self.subj1.pk)
        self.subj2 = Subject.objects.get(pk=self.subj2.pk)
        self.other_subj = Subject.objects.get(pk=self.other_subj.pk)

    def tearDown(self):
        translation.deactivate_all()
        super().tearDown()

    # ---------------------------------------------------------------------
    # Helpers
    # ---------------------------------------------------------------------
    def _set_parler_translation(self, obj, lang: str, **fields):
        """
        Helper parler robuste:
        - initialize=True force la création de la traduction si absente
        - refresh_from_db pour éviter tout cache “sale”
        """
        translation_model = obj._parler_meta.root_model
        translation_model.objects.update_or_create(
            master_id=obj.pk,
            language_code=lang,
            defaults=fields,
        )
        obj.refresh_from_db()
        return obj

    def _mk_question_with_translations(self, *, allow_multiple=False) -> Question:
        q = Question.objects.create(domain=self.domain, allow_multiple_correct=allow_multiple)

        # Phase 3 LMS refactor: only ``title`` remains as a parler field
        # on Question — ``description`` and ``explanation`` now live as
        # block rows. Tests that care about prompt/explanation content
        # build blocks via ``_mk_question_blocks`` below.
        self._set_parler_translation(q, "fr", title="Titre FR")
        self._set_parler_translation(q, "en", title="Title EN")

        return (
            Question.objects
            .prefetch_related("translations")
            .get(pk=q.pk)
        )

    def _mk_answer_option(self, q: Question, *, is_correct: bool, sort_order: int, fr: str, en: str) -> AnswerOption:
        """Phase 3 LMS refactor: AnswerOption.content is now a block
        list. Helper creates the option row and a single rich_text
        block under the ``body`` role with the per-language content.
        """
        from block.models import Block
        from django.contrib.contenttypes.models import ContentType

        ao = AnswerOption.objects.create(question=q, is_correct=is_correct, sort_order=sort_order)
        option_ct = ContentType.objects.get_for_model(AnswerOption)
        block = Block.objects.create(
            target_content_type=option_ct,
            target_object_id=ao.pk,
            block_type=Block.TYPE_RICH_TEXT,
            block_role=Block.ROLE_BODY,
            order=0,
        )
        translation_model = block._parler_meta.root_model
        translation_model.objects.create(master=block, language_code="fr", rich_text=fr)
        translation_model.objects.create(master=block, language_code="en", rich_text=en)
        return AnswerOption.objects.get(pk=ao.pk)

    # ---------------------------------------------------------------------
    # Read serializers basics
    # ---------------------------------------------------------------------
    def test_question_lite_serializer_title_in_any_language(self):
        q = self._mk_question_with_translations()
        data = QuestionLiteSerializer(q).data
        self.assertEqual(data["id"], q.id)
        self.assertIn(data["title"], ["Titre FR", "Title EN"])

    # ---------------------------------------------------------------------
    # Answer option serializers
    # ---------------------------------------------------------------------
    def test_answer_option_public_read_serializer_hides_is_correct(self):
        q = self._mk_question_with_translations()
        ao = self._mk_answer_option(q, is_correct=True, sort_order=0, fr="A FR", en="A EN")
        data = QuestionAnswerOptionPublicReadSerializer(ao).data
        self.assertNotIn("is_correct", data)
        # Phase 3 LMS refactor: option content now lives in nested
        # blocks; the FR translation surfaces from the rich_text field.
        self.assertEqual(len(data["blocks"]), 1)
        self.assertEqual(data["blocks"][0]["translations"]["fr"]["rich_text"], "A FR")

    def test_answer_option_read_serializer_includes_is_correct(self):
        q = self._mk_question_with_translations()
        ao = self._mk_answer_option(q, is_correct=True, sort_order=0, fr="A FR", en="A EN")
        data = QuestionAnswerOptionReadSerializer(ao, context={"show_correct": True}).data
        self.assertIn("is_correct", data)
        self.assertTrue(data["is_correct"])
        block = data["blocks"][0]
        self.assertEqual(block["translations"]["fr"]["rich_text"], "A FR")
        self.assertEqual(block["translations"]["en"]["rich_text"], "A EN")

    def test_answer_option_write_serializer_validates_blocks_shape(self):
        # Valid: blocks is a list of dicts.
        payload = {
            "is_correct": True, "sort_order": 0,
            "blocks": [{"block_type": "rich_text", "translations": {"fr": {"rich_text": "A"}}}],
        }
        s = QuestionAnswerOptionWriteSerializer(data=payload)
        self.assertTrue(s.is_valid(), s.errors)

        # ``blocks`` is optional now — content can be left blank on create
        # and filled in later through the Block ViewSet.
        s = QuestionAnswerOptionWriteSerializer(data={"is_correct": True, "sort_order": 0})
        self.assertTrue(s.is_valid(), s.errors)

    # ---------------------------------------------------------------------
    # QuestionInQuizQuestionSerializer: switch show_correct + swagger
    # ---------------------------------------------------------------------
    def test_question_in_quiz_serializer_switches_answer_option_serializer(self):
        q = self._mk_question_with_translations()
        self._mk_answer_option(q, is_correct=True, sort_order=0, fr="A", en="A")
        self._mk_answer_option(q, is_correct=False, sort_order=1, fr="B", en="B")

        q = Question.objects.prefetch_related("answer_options__blocks__translations", "translations").get(pk=q.pk)

        view = SimpleNamespace(swagger_fake_view=False)

        s = QuestionInQuizQuestionSerializer(q, context={"show_correct": False, "view": view})
        self.assertNotIn("is_correct", s.data["answer_options"][0])

        s2 = QuestionInQuizQuestionSerializer(q, context={"show_correct": True, "view": view})
        self.assertIn("is_correct", s2.data["answer_options"][0])

        view_swagger = SimpleNamespace(swagger_fake_view=True)
        s3 = QuestionInQuizQuestionSerializer(q, context={"show_correct": False, "view": view_swagger})
        self.assertIn("is_correct", s3.data["answer_options"][0])

    # ---------------------------------------------------------------------
    # QuestionReadSerializer: translations + switch answer_options
    # ---------------------------------------------------------------------
    def test_question_read_serializer_translations_and_answer_options_switch(self):
        q = self._mk_question_with_translations()
        self._mk_answer_option(q, is_correct=True, sort_order=0, fr="A", en="A")
        self._mk_answer_option(q, is_correct=False, sort_order=1, fr="B", en="B")

        # Refetch clean + prefetched
        q = (
            Question.objects
            .prefetch_related("translations", "answer_options__blocks__translations")
            .get(pk=q.pk)
        )

        view = SimpleNamespace(swagger_fake_view=False)

        s = QuestionReadSerializer(q, context={"show_correct": False, "view": view})
        data = s.data

        self.assertIn("translations", data)
        self.assertIn("fr", data["translations"])
        self.assertEqual(data["translations"]["fr"]["title"], "Titre FR")
        # Phase 3 LMS refactor: prompt / explanation surface as block lists.
        self.assertIn("prompt_blocks", data)
        self.assertIn("explanation_blocks", data)

        self.assertNotIn("is_correct", data["answer_options"][0])

        s2 = QuestionReadSerializer(q, context={"show_correct": True, "view": view})
        data2 = s2.data
        self.assertIn("is_correct", data2["answer_options"][0])
        self.assertEqual(data2["answer_options"][0]["blocks"][0]["translations"]["fr"]["rich_text"], "A")
        self.assertEqual(data2["answer_options"][1]["blocks"][0]["translations"]["en"]["rich_text"], "B")

    def test_question_read_serializer_hides_correctness_without_explicit_context(self):
        q = self._mk_question_with_translations()
        self._mk_answer_option(q, is_correct=True, sort_order=0, fr="A", en="A")
        self._mk_answer_option(q, is_correct=False, sort_order=1, fr="B", en="B")
        q = (
            Question.objects
            .prefetch_related("translations", "answer_options__blocks__translations")
            .get(pk=q.pk)
        )

        data = QuestionReadSerializer(q, context={}).data

        self.assertNotIn("is_correct", data["answer_options"][0])

    # ---------------------------------------------------------------------
    # QuestionWriteSerializer: validate + create
    # ---------------------------------------------------------------------
    def _base_question_payload(self):
        return {
            "domain": self.domain.id,
            "translations": {
                "fr": {"title": "Titre FR"},
                "en": {"title": "Title EN"},
            },
            "allow_multiple_correct": False,
            "active": True,
            "is_mode_practice": True,
            "is_mode_exam": False,
            "subject_ids": [self.subj1.id, self.subj2.id],
            "answer_options": [
                {
                    "is_correct": True, "sort_order": 0,
                    "blocks": [{
                        "block_type": "rich_text",
                        "translations": {
                            "fr": {"rich_text": "A"},
                            "en": {"rich_text": "A"},
                        },
                    }],
                },
                {
                    "is_correct": False, "sort_order": 1,
                    "blocks": [{
                        "block_type": "rich_text",
                        "translations": {
                            "fr": {"rich_text": "B"},
                            "en": {"rich_text": "B"},
                        },
                    }],
                },
            ],
        }

    def test_question_write_serializer_validate_answer_options_blocks_shape(self):
        payload = self._base_question_payload()
        payload["answer_options"][0]["blocks"] = "oops"
        s = QuestionWriteSerializer(data=payload)
        self.assertFalse(s.is_valid())
        self.assertIn("answer_options[0].blocks", s.errors)

    def test_question_write_serializer_rejects_subject_from_other_domain(self):
        payload = self._base_question_payload()
        payload["subject_ids"] = [self.subj1.id, self.other_subj.id]

        s = QuestionWriteSerializer(data=payload, context={"request": SimpleNamespace(user=self.owner)})
        self.assertFalse(s.is_valid())
        self.assertIn("subject_ids", s.errors)
        self.assertIn("Subjects hors domain", str(s.errors["subject_ids"]))

    def test_question_write_serializer_rejects_unmanageable_domain(self):
        payload = self._base_question_payload()
        payload["domain"] = self.other_domain.id

        s = QuestionWriteSerializer(data=payload, context={"request": SimpleNamespace(user=self.outsider)})
        self.assertFalse(s.is_valid())
        self.assertIn("domain", s.errors)
        self.assertIn("Vous ne pouvez pas gerer ce domaine", str(s.errors["domain"]))

    def test_question_write_serializer_rejects_domain_change_if_existing_subjects_do_not_match(self):
        q = self._mk_question_with_translations()
        q.subjects.set([self.subj1])

        payload = {"domain": self.other_domain.id}
        s = QuestionWriteSerializer(instance=q, data=payload, partial=True)

        self.assertFalse(s.is_valid())
        self.assertIn("subject_ids", s.errors)
        self.assertIn("nouveau domain", str(s.errors["subject_ids"]))

    def test_question_write_serializer_create_full(self):
        payload = self._base_question_payload()

        s = QuestionWriteSerializer(data=payload, context={"request": SimpleNamespace(user=self.owner)})
        self.assertTrue(s.is_valid(), s.errors)
        q = s.save()

        q = (
            Question.objects
            .prefetch_related("translations", "answer_options__blocks__translations", "subjects")
            .get(pk=q.pk)
        )

        self.assertEqual(q.safe_translation_getter("title", language_code="fr"), "Titre FR")
        self.assertEqual(set(q.subjects.values_list("id", flat=True)), {self.subj1.id, self.subj2.id})

    def test_question_write_serializer_update_preserves_existing_answer_option_ids(self):
        q = self._mk_question_with_translations()
        first = self._mk_answer_option(q, is_correct=True, sort_order=0, fr="A FR", en="A EN")
        second = self._mk_answer_option(q, is_correct=False, sort_order=1, fr="B FR", en="B EN")

        payload = {
            "allow_multiple_correct": True,
            "answer_options": [
                {
                    "id": first.id,
                    "is_correct": False,
                    "sort_order": 2,
                    "blocks": [{
                        "block_type": "rich_text",
                        "translations": {"fr": {"rich_text": "A2 FR"}, "en": {"rich_text": "A2 EN"}},
                    }],
                },
                {
                    "id": second.id,
                    "is_correct": True,
                    "sort_order": 1,
                    "blocks": [{
                        "block_type": "rich_text",
                        "translations": {"fr": {"rich_text": "B2 FR"}, "en": {"rich_text": "B2 EN"}},
                    }],
                },
            ]
        }

        s = QuestionWriteSerializer(instance=q, data=payload, partial=True, context={"request": SimpleNamespace(user=self.owner)})
        self.assertTrue(s.is_valid(), s.errors)
        updated = s.save()

        option_ids = list(updated.answer_options.order_by("id").values_list("id", flat=True))
        self.assertEqual(option_ids, [first.id, second.id])
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertEqual(first.sort_order, 2)
        self.assertFalse(first.is_correct)
        first_block = first.blocks.get()
        self.assertEqual(first_block.translations.get(language_code="fr").rich_text, "A2 FR")
        self.assertTrue(second.is_correct)
        second_block = second.blocks.get()
        self.assertEqual(second_block.translations.get(language_code="en").rich_text, "B2 EN")

    def test_question_write_serializer_update_rejects_removal_of_answer_option_used_in_quiz(self):
        from quiz.models import Quiz, QuizQuestion, QuizQuestionAnswer, QuizTemplate

        q = self._mk_question_with_translations()
        first = self._mk_answer_option(q, is_correct=True, sort_order=0, fr="A FR", en="A EN")
        second = self._mk_answer_option(q, is_correct=False, sort_order=1, fr="B FR", en="B EN")

        template = QuizTemplate.objects.create(title="Serializer Quiz", domain=self.domain, created_by=self.owner)
        quiz_question = QuizQuestion.objects.create(quiz=template, question=q, sort_order=1, weight=1)
        quiz = Quiz.objects.create(
            quiz_template=template,
            user=self.owner,
            active=True,
            started_at=timezone.now(),
        )
        answer = QuizQuestionAnswer.objects.create(quiz=quiz, quizquestion=quiz_question, question_order=1)
        answer.selected_options.set([second])

        payload = {
            "allow_multiple_correct": True,
            "answer_options": [
                {
                    "id": first.id,
                    "is_correct": True,
                    "sort_order": 0,
                    "blocks": [{
                        "block_type": "rich_text",
                        "translations": {"fr": {"rich_text": "A FR"}, "en": {"rich_text": "A EN"}},
                    }],
                }
            ]
        }

        s = QuestionWriteSerializer(instance=q, data=payload, partial=True, context={"request": SimpleNamespace(user=self.owner)})
        self.assertTrue(s.is_valid(), s.errors)
        with self.assertRaises(serializers.ValidationError) as ctx:
            s.save()
        self.assertIn("answer_options", ctx.exception.detail)
        self.assertIn("deja utilisees", str(ctx.exception.detail["answer_options"]))

    def test_sync_question_answer_options_rejects_invalid_final_state(self):
        q = self._mk_question_with_translations()
        first = self._mk_answer_option(q, is_correct=True, sort_order=0, fr="A FR", en="A EN")
        self._mk_answer_option(q, is_correct=False, sort_order=1, fr="B FR", en="B EN")

        with self.assertRaises(serializers.ValidationError) as ctx:
            sync_question_answer_options(
                question=q,
                answer_options_data=[
                    {
                        "id": first.id,
                        "is_correct": True,
                        "sort_order": 0,
                        "blocks": [{
                            "block_type": "rich_text",
                            "translations": {"fr": {"rich_text": "A FR"}, "en": {"rich_text": "A EN"}},
                        }],
                    }
                ],
            )

        self.assertIn("answer_options", ctx.exception.detail)
        self.assertIn("Au moins 2 réponses", str(ctx.exception.detail["answer_options"]))

    def test_sync_question_answer_options_does_not_query_final_state_when_no_removal(self):
        q = self._mk_question_with_translations()
        first = self._mk_answer_option(q, is_correct=True, sort_order=0, fr="A FR", en="A EN")
        second = self._mk_answer_option(q, is_correct=False, sort_order=1, fr="B FR", en="B EN")

        manager_type = type(q.answer_options)
        with patch.object(manager_type, "exclude", side_effect=AssertionError("exclude should not be called")):
            sync_question_answer_options(
                question=q,
                answer_options_data=[
                    {
                        "id": first.id,
                        "is_correct": True,
                        "sort_order": 0,
                        "blocks": [{
                            "block_type": "rich_text",
                            "translations": {"fr": {"rich_text": "A FR mod"}, "en": {"rich_text": "A EN mod"}},
                        }],
                    },
                    {
                        "id": second.id,
                        "is_correct": False,
                        "sort_order": 1,
                        "blocks": [{
                            "block_type": "rich_text",
                            "translations": {"fr": {"rich_text": "B FR mod"}, "en": {"rich_text": "B EN mod"}},
                        }],
                    },
                ],
            )

    def test_question_write_serializer_update_allows_text_change_for_answer_option_used_in_quiz(self):
        from quiz.models import Quiz, QuizQuestion, QuizQuestionAnswer, QuizTemplate

        q = self._mk_question_with_translations()
        first = self._mk_answer_option(q, is_correct=True, sort_order=0, fr="A FR", en="A EN")
        second = self._mk_answer_option(q, is_correct=False, sort_order=1, fr="B FR", en="B EN")

        template = QuizTemplate.objects.create(title="Serializer Quiz", domain=self.domain, created_by=self.owner)
        quiz_question = QuizQuestion.objects.create(quiz=template, question=q, sort_order=1, weight=1)
        quiz = Quiz.objects.create(
            quiz_template=template,
            user=self.owner,
            active=True,
            started_at=timezone.now(),
        )
        answer = QuizQuestionAnswer.objects.create(quiz=quiz, quizquestion=quiz_question, question_order=1)
        answer.selected_options.set([second])

        payload = {
            "is_mode_exam": True,
            "answer_options": [
                {
                    "id": first.id,
                    "is_correct": True,
                    "sort_order": 0,
                    "blocks": [{
                        "block_type": "rich_text",
                        "translations": {"fr": {"rich_text": "A FR mod"}, "en": {"rich_text": "A EN mod"}},
                    }],
                },
                {
                    "id": second.id,
                    "is_correct": False,
                    "sort_order": 1,
                    "blocks": [{
                        "block_type": "rich_text",
                        "translations": {"fr": {"rich_text": "B FR mod"}, "en": {"rich_text": "B EN mod"}},
                    }],
                },
            ],
        }

        s = QuestionWriteSerializer(instance=q, data=payload, partial=True, context={"request": SimpleNamespace(user=self.owner)})
        self.assertTrue(s.is_valid(), s.errors)
        updated = s.save()

        updated.refresh_from_db()
        second.refresh_from_db()
        self.assertTrue(updated.is_mode_exam)
        block = second.blocks.get()
        self.assertEqual(block.translations.get(language_code="fr").rich_text, "B FR mod")
        self.assertFalse(second.is_correct)

    def test_question_write_serializer_update_rejects_correctness_change_for_answer_option_used_in_quiz(self):
        from quiz.models import Quiz, QuizQuestion, QuizQuestionAnswer, QuizTemplate

        q = self._mk_question_with_translations()
        first = self._mk_answer_option(q, is_correct=True, sort_order=0, fr="A FR", en="A EN")
        second = self._mk_answer_option(q, is_correct=False, sort_order=1, fr="B FR", en="B EN")

        template = QuizTemplate.objects.create(title="Serializer Quiz", domain=self.domain, created_by=self.owner)
        quiz_question = QuizQuestion.objects.create(quiz=template, question=q, sort_order=1, weight=1)
        quiz = Quiz.objects.create(
            quiz_template=template,
            user=self.owner,
            active=True,
            started_at=timezone.now(),
        )
        answer = QuizQuestionAnswer.objects.create(quiz=quiz, quizquestion=quiz_question, question_order=1)
        answer.selected_options.set([second])

        payload = {
            "allow_multiple_correct": True,
            "answer_options": [
                {
                    "id": first.id,
                    "is_correct": True,
                    "sort_order": 0,
                    "blocks": [{
                        "block_type": "rich_text",
                        "translations": {"fr": {"rich_text": "A FR"}, "en": {"rich_text": "A EN"}},
                    }],
                },
                {
                    "id": second.id,
                    "is_correct": True,
                    "sort_order": 1,
                    "blocks": [{
                        "block_type": "rich_text",
                        "translations": {"fr": {"rich_text": "B FR"}, "en": {"rich_text": "B EN"}},
                    }],
                },
            ]
        }

        s = QuestionWriteSerializer(instance=q, data=payload, partial=True, context={"request": SimpleNamespace(user=self.owner)})
        self.assertTrue(s.is_valid(), s.errors)
        with self.assertRaises(serializers.ValidationError) as ctx:
            s.save()
        self.assertIn("answer_options", ctx.exception.detail)
        self.assertIn("correcte/incorrecte", str(ctx.exception.detail["answer_options"]))

    def test_question_read_serializer_uses_prefetched_question_translations(self):
        q = self._mk_question_with_translations()
        self._mk_answer_option(q, is_correct=True, sort_order=0, fr="A FR", en="A EN")
        self._mk_answer_option(q, is_correct=False, sort_order=1, fr="B FR", en="B EN")

        prefetched = (
            Question.objects
            .prefetch_related("translations", "answer_options__blocks__translations")
            .get(pk=q.pk)
        )
        serializer = QuestionReadSerializer()

        with self.assertNumQueries(0):
            translations = serializer.get_translations(prefetched)

        self.assertEqual(translations["fr"]["title"], "Titre FR")
        self.assertEqual(translations["en"]["title"], "Title EN")
