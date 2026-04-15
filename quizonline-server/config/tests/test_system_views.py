from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class SystemConfigViewTests(APITestCase):
    URL = "/api/admin/system-config/"
    CHECK_URL = "/api/admin/system-check/"

    def setUp(self):
        self.admin = User.objects.create_user(
            username="staff-admin",
            password="Pass1234!",
            email="admin@example.com",
            is_staff=True,
        )
        self.user = User.objects.create_user(
            username="basic-user",
            password="Pass1234!",
            email="user@example.com",
        )

    def test_admin_can_read_system_config(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        sections = {section["label"]: section["values"] for section in response.data["sections"]}
        self.assertIn("db", sections)
        self.assertIn("email", sections)
        self.assertIn("upload", sections)
        self.assertIn("deepl", sections)
        self.assertIn("engine", sections["db"])
        self.assertIn("host_password_configured", sections["email"])

    def test_non_admin_cannot_read_system_config(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(self.URL)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_run_db_check(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(self.CHECK_URL, {"target": "db"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["target"], "db")
        self.assertEqual(response.data["status"], "ok")

    @override_settings(USE_DEEPL=False)
    def test_deepl_check_is_skipped_when_disabled(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(self.CHECK_URL, {"target": "deepl"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "skipped")

    @patch("admin_api.system_views.deepl_translate_many", return_value=["bonjour"])
    @override_settings(USE_DEEPL=True, DEEPL_AUTH_KEY="secret", DEEPL_IS_FREE=True)
    def test_deepl_check_calls_service_when_enabled(self, deepl_mock):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(self.CHECK_URL, {"target": "deepl"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")
        deepl_mock.assert_called_once()
