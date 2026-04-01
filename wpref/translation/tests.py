from django.contrib.auth import get_user_model
from django.urls import reverse
from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class TranslateBatchViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="translator", password="translatorpass123!")
        self.url = reverse("api:translate-api:translate-batch")

    def test_translate_batch_requires_authentication(self):
        response = self.client.post(
            self.url,
            {
                "source": "fr",
                "target": "nl",
                "items": [{"key": "name", "text": "Bonjour", "format": "text"}],
            },
            format="json",
        )

        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_translate_batch_preserves_html_mode_with_mock_backend(self):
        self.client.force_authenticate(self.user)

        with patch("translation.views.deepl_translate_many", return_value=["<p>Bonjour nl</p>"]):
            response = self.client.post(
                self.url,
                {
                    "source": "fr",
                    "target": "nl",
                    "items": [{"key": "description", "text": "<p>Bonjour</p>", "format": "html"}],
                },
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["translations"]["description"], "<p>Bonjour nl</p>")
