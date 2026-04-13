from django.contrib.auth import get_user_model
from django.utils import timezone
from domain.models import Domain
from question.models import Question
from quiz.models import Quiz, QuizTemplate
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

DASHBOARD_URL = "/api/stats/dashboard/"


class DashboardStatsTests(APITestCase):
    """Tests for GET /api/stats/dashboard/."""

    def setUp(self):
        # --- users ---
        self.superuser = User.objects.create_superuser(
            username="super", password="pass1234", email="super@example.com",
        )
        self.staff_user = User.objects.create_user(
            username="staff", password="pass1234", email="staff@example.com",
            is_staff=True,
        )
        self.regular_user = User.objects.create_user(
            username="regular", password="pass1234", email="regular@example.com",
        )
        self.other_staff = User.objects.create_user(
            username="other_staff", password="pass1234", email="other@example.com",
            is_staff=True,
        )

        # --- domains ---
        self.domain1 = Domain.objects.create(owner=self.staff_user, active=True)
        self.domain1.set_current_language("fr")
        self.domain1.name = "Sciences"
        self.domain1.description = ""
        self.domain1.save()
        self.domain1.members.add(self.regular_user)

        self.domain2 = Domain.objects.create(owner=self.other_staff, active=True)
        self.domain2.set_current_language("en")
        self.domain2.name = "History"
        self.domain2.description = ""
        self.domain2.save()

        # --- questions ---
        self.q1 = Question.objects.create(domain=self.domain1, active=True)
        self.q1.set_current_language("fr")
        self.q1.title = "Q1"
        self.q1.save()

        # --- quiz templates + sessions ---
        self.qt1 = QuizTemplate.objects.create(
            domain=self.domain1, title="QT1", active=True,
            with_duration=False,
        )
        # completed session (active=False, started_at set)
        Quiz.objects.create(
            domain=self.domain1, quiz_template=self.qt1,
            user=self.regular_user, active=False, started_at=timezone.now(),
        )
        # active (non-completed) session
        Quiz.objects.create(
            domain=self.domain1, quiz_template=self.qt1,
            user=self.regular_user, active=True, started_at=timezone.now(),
        )

    # ---------------------------------------------------------------
    # 1. Superuser sees all stats
    # ---------------------------------------------------------------
    def test_superuser_sees_all_stats(self):
        self.client.force_authenticate(self.superuser)
        resp = self.client.get(DASHBOARD_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()

        # totals present
        self.assertIn("totals", data)
        totals = data["totals"]
        for key in ("active_users", "active_domains", "active_questions", "completed_sessions"):
            self.assertIn(key, totals)

        # domains list
        self.assertIn("domains", data)
        # superuser sees both domains
        domain_ids = {d["id"] for d in data["domains"]}
        self.assertIn(self.domain1.pk, domain_ids)
        self.assertIn(self.domain2.pk, domain_ids)

        # check shape of domain entry
        d1 = next(d for d in data["domains"] if d["id"] == self.domain1.pk)
        self.assertIn("translations", d1)
        for field in ("members_count", "managers_count", "questions_count",
                       "templates_count", "sessions_total", "sessions_completed"):
            self.assertIn(field, d1)

        # verify some counts for domain1
        self.assertEqual(d1["members_count"], 1)  # regular_user
        self.assertEqual(d1["questions_count"], 1)
        self.assertEqual(d1["templates_count"], 1)
        self.assertEqual(d1["sessions_total"], 2)
        self.assertEqual(d1["sessions_completed"], 1)

    # ---------------------------------------------------------------
    # 2. Staff sees only own domains
    # ---------------------------------------------------------------
    def test_staff_sees_only_own_domains(self):
        self.client.force_authenticate(self.staff_user)
        resp = self.client.get(DASHBOARD_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()

        domain_ids = {d["id"] for d in data["domains"]}
        self.assertIn(self.domain1.pk, domain_ids)
        self.assertNotIn(self.domain2.pk, domain_ids)

        # totals should be scoped
        self.assertEqual(data["totals"]["active_domains"], 1)

    # ---------------------------------------------------------------
    # 3. Regular user gets 403
    # ---------------------------------------------------------------
    def test_regular_user_forbidden(self):
        self.client.force_authenticate(self.regular_user)
        resp = self.client.get(DASHBOARD_URL)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    # ---------------------------------------------------------------
    # 4. Anonymous gets 401
    # ---------------------------------------------------------------
    def test_anonymous_unauthorized(self):
        resp = self.client.get(DASHBOARD_URL)
        self.assertIn(resp.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
