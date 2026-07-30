"""
Regression tests for the ``start`` / ``close`` row locking.

Context — production incident of 2026-07-23 (QUIZONLINE-BACKEND-9):

    NotSupportedError: FOR UPDATE is not allowed with DISTINCT clause

``start`` locked the row through ``self.get_queryset()``. For a *domain
manager* that queryset carries a ``.distinct()`` — the OR union between owned
quizzes and quizzes of manageable domains — and PostgreSQL rejects
``SELECT DISTINCT ... FOR UPDATE``. Staff users returned before the
``.distinct()`` and plain learners fell through to ``filter(user=user)``, so
the bug only ever hit non-staff domain managers.

⚠️ READ THIS BEFORE TRUSTING THESE TESTS ⚠️

The suite runs on **SQLite** (no ``services:`` block in ci.yml,
``settings_test`` defines no DATABASES, so ``settings_base`` defaults to
``sqlite:///db.sqlite3``), while production runs on **PostgreSQL**. SQLite
silently accepts ``DISTINCT`` + ``FOR UPDATE``, so **no behavioural test here
can reproduce the original crash** — which is precisely why 1194 green tests
never caught it. See OPERATIONS.md §3.13.

So these tests split in two:

- ``test_start_fetches_the_row_through_a_non_distinct_query`` and its ``close``
  twin assert on the *shape of the SQL* rather than on database behaviour: the
  row must be fetched by a plain, join-free, DISTINCT-free query. These are the
  only two that fail without the fix — verified by reverting the mixin and
  re-running.
- the remaining endpoint tests guard the other half of the fix: the locked row
  is fetched from a bare queryset, so it lacks the ``_earned_score`` /
  ``_max_score`` annotations that ``QuizSerializer`` reads. Serialising the
  locked instance would raise ``AttributeError``; we reload through the scoped
  queryset instead, and these assert the response still carries the scores.
  They pass with and without the fix — they pin the new path against a future
  regression, they do not reproduce the incident.
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import translation
from rest_framework import status
from rest_framework.test import APITestCase

from domain.models import Domain
from question.models import AnswerOption, Question, QuestionSubject
from quiz.constants import VISIBILITY_IMMEDIATE
from quiz.models import Quiz, QuizQuestion, QuizTemplate
from quiz.querysets import quiz_queryset_for_user
from subject.models import Subject

User = get_user_model()


class QuizLifecycleLockingTestCase(APITestCase):
    def setUp(self):
        super().setUp()
        # Domain.name / QuizTemplate.title are parler-translated: without an
        # active language their create() raises. Passes in isolation because an
        # earlier test happened to leave one active — fails in the full suite.
        translation.activate("fr")
        # A domain MANAGER who is not staff — the only profile that hit the bug.
        self.manager = User.objects.create_user(
            email="manager@example.test", password="pass", language="fr"
        )
        self.domain = Domain.objects.create(
            owner=self.manager, name="D-lock", description="", active=True
        )
        self.subject = Subject.objects.create(domain=self.domain, name="Sujet verrou")
        self.question = Question.objects.create(
            domain=self.domain,
            title="Question verrou",
            allow_multiple_correct=False,
            active=True,
            is_mode_practice=True,
            is_mode_exam=True,
        )
        QuestionSubject.objects.create(
            question=self.question, subject=self.subject, sort_order=1
        )
        AnswerOption.objects.create(
            question=self.question, is_correct=True, sort_order=1
        )
        self.template = QuizTemplate.objects.create(
            domain=self.domain,
            title="Quiz verrou",
            mode=QuizTemplate.MODE_EXAM,
            description="",
            max_questions=10,
            permanent=True,
            with_duration=False,
            duration=10,
            is_public=True,
            active=True,
            result_visibility=VISIBILITY_IMMEDIATE,
            detail_visibility=VISIBILITY_IMMEDIATE,
            created_by=self.manager,
        )
        QuizQuestion.objects.create(
            quiz=self.template, question=self.question, sort_order=1, weight=1
        )
        self.quiz = Quiz.objects.create(
            domain=self.domain,
            quiz_template=self.template,
            user=self.manager,
        )
        self.client.force_authenticate(user=self.manager)

    def test_scoped_queryset_is_distinct_for_a_domain_manager(self):
        """Pins the precondition: without it the other tests prove nothing."""
        queryset = quiz_queryset_for_user(
            self.manager, include_details=True, include_manageable_templates=True
        )
        self.assertTrue(
            queryset.query.distinct,
            "The manager queryset is expected to be DISTINCT — if this ever "
            "stops being true the locking workaround may no longer be needed.",
        )

    def test_start_fetches_the_row_through_a_non_distinct_query(self):
        """
        The invariant the incident is really about, and the ONE test here that
        actually fails without the fix.

        It cannot assert on ``FOR UPDATE`` — SQLite never emits it. Instead it
        asserts the shape that matters: ``start`` must issue a plain, join-free,
        DISTINCT-free ``SELECT ... FROM quiz_quiz WHERE id = …``. Before the fix
        the row was only ever fetched through the scoped queryset, which is
        DISTINCT — so no such query existed and this fails.
        """
        with CaptureQueriesContext(connection) as captured:
            response = self.client.post(f"/api/v1/quiz/{self.quiz.id}/start/")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        table = Quiz._meta.db_table
        bare_row_fetches = [
            q["sql"]
            for q in captured.captured_queries
            if q["sql"].lstrip().upper().startswith("SELECT")
            and f'"{table}"' in q["sql"]
            and "DISTINCT" not in q["sql"].upper()
            and "JOIN" not in q["sql"].upper()
        ]
        self.assertTrue(
            bare_row_fetches,
            "start() never fetched the quiz row through a plain query. It is "
            "locking through the scoped (DISTINCT) queryset again — PostgreSQL "
            "rejects SELECT DISTINCT ... FOR UPDATE (QUIZONLINE-BACKEND-9).",
        )

    def test_close_fetches_the_row_through_a_non_distinct_query(self):
        """``close`` carries the exact same lock, so the exact same trap."""
        self.client.post(f"/api/v1/quiz/{self.quiz.id}/start/")
        with CaptureQueriesContext(connection) as captured:
            response = self.client.post(f"/api/v1/quiz/{self.quiz.id}/close/")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        table = Quiz._meta.db_table
        bare_row_fetches = [
            q["sql"]
            for q in captured.captured_queries
            if q["sql"].lstrip().upper().startswith("SELECT")
            and f'"{table}"' in q["sql"]
            and "DISTINCT" not in q["sql"].upper()
            and "JOIN" not in q["sql"].upper()
        ]
        self.assertTrue(
            bare_row_fetches,
            "close() never fetched the quiz row through a plain query "
            "(QUIZONLINE-BACKEND-9).",
        )

    def test_a_domain_manager_can_start_a_quiz_and_gets_the_scores(self):
        response = self.client.post(f"/api/v1/quiz/{self.quiz.id}/start/")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        # Proves the response was serialised from the ANNOTATED queryset, not
        # from the bare locked row.
        self.assertIn("earned_score", response.data)
        self.assertIn("max_score", response.data)
        self.quiz.refresh_from_db()
        self.assertIsNotNone(self.quiz.started_at)

    def test_starting_twice_is_idempotent_and_still_serialises(self):
        """The early-return branch reads the locked row too — same trap."""
        first = self.client.post(f"/api/v1/quiz/{self.quiz.id}/start/")
        self.assertEqual(first.status_code, status.HTTP_200_OK, first.data)
        second = self.client.post(f"/api/v1/quiz/{self.quiz.id}/start/")
        self.assertEqual(second.status_code, status.HTTP_200_OK, second.data)
        self.assertIn("earned_score", second.data)

    def test_a_stranger_still_gets_404(self):
        """The permission scoping must survive the change of locking path."""
        stranger = User.objects.create_user(
            email="stranger@example.test", password="pass"
        )
        self.client.force_authenticate(user=stranger)
        response = self.client.post(f"/api/v1/quiz/{self.quiz.id}/start/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND, response.data)
