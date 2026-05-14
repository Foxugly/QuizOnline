from customuser.models import CustomUser
from django.urls import reverse
from rest_framework.test import APITestCase
from unittest.mock import patch

from domain.models import Domain


class CustomUserApiTests(APITestCase):
    @patch("customuser.services.send_registration_confirmation_email")
    def test_create_user(self, send_registration_confirmation_email):
        url = reverse("api:user-api:api-root")  # /api/user/
        payload = {
            "username": "JohnDoe",
            "email": "john@example.com",
            "first_name": "John",
            "last_name": "Doe",
            "password": "SuperSecret123",
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(CustomUser.objects.count(), 1)
        user = CustomUser.objects.get(username="JohnDoe")
        self.assertEqual(user.email, "john@example.com")
        send_registration_confirmation_email.assert_called_once_with(user)


class CustomUserListTests(APITestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="AdminPass123",
        )
        self.url = reverse("api:user-api:api-root")  # GET sur /api/user/

    def test_list_users_anonymous_forbidden(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 401)  # pas de token

    def test_list_users_as_admin(self):
        # on force l'authentification avec le client de test
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        results = response.data["results"] if isinstance(response.data, dict) else response.data
        self.assertIsInstance(results, list)
        self.assertGreaterEqual(len(results), 1)


class CustomUserDeleteSelfTests(APITestCase):
    """Self-service GDPR account deletion via DELETE /api/user/me/."""

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="Pwd!2026Alice",
        )
        self.url = "/api/user/me/"

    def test_anonymous_rejected(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, 401)

    def test_self_delete_succeeds_when_no_owned_domain(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(CustomUser.objects.filter(pk=self.user.pk).exists())

    def test_self_delete_refused_when_owning_active_domain(self):
        Domain.objects.create(owner=self.user, active=True)
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["detail"], "owner_of_domains")
        self.assertEqual(response.data["owned_count"], 1)
        self.assertTrue(CustomUser.objects.filter(pk=self.user.pk).exists())

    def test_self_delete_refused_even_when_only_inactive_domain_owned(self):
        # ``Domain.owner`` is PROTECT, so an inactive owned row still
        # blocks deletion. Block at the API level with a clean 409
        # instead of letting the DB raise ProtectedError → 500.
        Domain.objects.create(owner=self.user, active=False)
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["detail"], "owner_of_domains")
        self.assertTrue(CustomUser.objects.filter(pk=self.user.pk).exists())
