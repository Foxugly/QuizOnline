from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone, translation

from domain.models import Domain
from quiz.constants import VISIBILITY_NEVER
from quiz.models import Quiz, QuizTemplate
from quiz.policies import (
    ANSWER_CORRECTNESS_FULL,
    ANSWER_CORRECTNESS_UNKNOWN,
    answer_correctness_state,
    can_show_quiz_details,
    can_show_quiz_result,
    is_quiz_admin,
)

User = get_user_model()


class QuizPoliciesTestCase(TestCase):
    def setUp(self):
        super().setUp()
        translation.activate("fr")
        self.owner = User.objects.create_user(username="owner", password="pass")
        self.staff = User.objects.create_user(username="staff", password="pass", is_staff=True)
        self.domain = Domain.objects.create(owner=self.owner, name="Domaine", description="", active=True)

    def tearDown(self):
        translation.deactivate_all()
        super().tearDown()

    def make_template(self, **overrides):
        defaults = {
            "domain": self.domain,
            "title": "Template",
            "mode": QuizTemplate.MODE_EXAM,
            "description": "",
            "max_questions": 10,
            "permanent": True,
            "with_duration": True,
            "duration": 10,
            "active": True,
            "result_visibility": VISIBILITY_NEVER,
            "detail_visibility": VISIBILITY_NEVER,
        }
        defaults.update(overrides)
        return QuizTemplate.objects.create(**defaults)

    def make_quiz(self, template: QuizTemplate, **overrides):
        defaults = {
            "quiz_template": template,
            "user": self.owner,
            "active": True,
            "started_at": timezone.now(),
        }
        defaults.update(overrides)
        return Quiz.objects.create(**defaults)

    def test_is_quiz_admin_detects_staff_and_superuser(self):
        superuser = User.objects.create_user(username="root", password="pass", is_superuser=True)

        self.assertFalse(is_quiz_admin(self.owner))
        self.assertTrue(is_quiz_admin(self.staff))
        self.assertTrue(is_quiz_admin(superuser))

    def test_practice_quiz_returns_full_correctness_for_regular_user(self):
        quiz = self.make_quiz(self.make_template(mode=QuizTemplate.MODE_PRACTICE))

        self.assertEqual(
            answer_correctness_state(quiz=quiz, user=self.owner),
            ANSWER_CORRECTNESS_FULL,
        )

    def test_running_exam_returns_unknown_correctness_for_regular_user(self):
        quiz = self.make_quiz(self.make_template())

        self.assertEqual(
            answer_correctness_state(quiz=quiz, user=self.owner),
            ANSWER_CORRECTNESS_UNKNOWN,
        )

    def test_closed_exam_with_visible_details_returns_full_correctness(self):
        quiz = self.make_quiz(
            self.make_template(detail_visibility="immediate"),
            active=False,
            ended_at=timezone.now(),
        )

        self.assertEqual(
            answer_correctness_state(quiz=quiz, user=self.owner),
            ANSWER_CORRECTNESS_FULL,
        )

    def test_closed_exam_without_visible_details_stays_unknown(self):
        quiz = self.make_quiz(
            self.make_template(detail_visibility=VISIBILITY_NEVER),
            active=False,
            ended_at=timezone.now(),
        )

        self.assertEqual(
            answer_correctness_state(quiz=quiz, user=self.owner),
            ANSWER_CORRECTNESS_UNKNOWN,
        )

    def test_staff_can_see_result_and_details_even_when_template_hides_them(self):
        quiz = self.make_quiz(self.make_template())

        self.assertTrue(can_show_quiz_result(quiz=quiz, user=self.staff))
        self.assertTrue(can_show_quiz_details(quiz=quiz, user=self.staff))
        self.assertEqual(
            answer_correctness_state(quiz=quiz, user=self.staff),
            ANSWER_CORRECTNESS_FULL,
        )
