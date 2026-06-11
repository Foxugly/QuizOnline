"""``session_quiz_questions`` must honour ``QuizTemplate.max_questions``:
the session presents (and therefore scores) only the configured subset of the
pool — not the whole pool.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import translation

from domain.models import Domain
from question.models import AnswerOption, Question
from quiz.models import Quiz, QuizQuestion, QuizTemplate
from quiz.ordering import session_quiz_questions

User = get_user_model()


class SessionQuizQuestionsCapTests(TestCase):
    def setUp(self):
        # Domain / Question are parler-translated; activate a language so
        # ``name`` / ``title`` assignment outside a request works.
        translation.activate("fr")
        self.addCleanup(translation.deactivate_all)
        self.owner = User.objects.create_user(username="owner", password="x")
        self.domain = Domain.objects.create(owner=self.owner, name="D", description="", active=True)
        self.template = QuizTemplate.objects.create(
            domain=self.domain, title="T", max_questions=3,
            shuffle_questions=False, created_by=self.owner,
        )
        # Pool of 5 questions, larger than max_questions=3.
        self.questions = []
        for i in range(5):
            q = Question.objects.create(domain=self.domain, title=f"Q{i}", active=True)
            AnswerOption.objects.create(question=q, is_correct=True, sort_order=1)
            QuizQuestion.objects.create(quiz=self.template, question=q, sort_order=i, weight=1)
            self.questions.append(q)

    def _quiz(self):
        return Quiz.objects.create(
            domain=self.domain, quiz_template=self.template, user=self.owner,
        )

    def test_cap_slices_pool_to_max_questions(self):
        result = session_quiz_questions(self._quiz())
        self.assertEqual(len(result), 3)

    def test_no_cap_when_max_questions_exceeds_pool(self):
        self.template.max_questions = 99
        self.template.save(update_fields=["max_questions"])
        result = session_quiz_questions(self._quiz())
        self.assertEqual(len(result), 5)
