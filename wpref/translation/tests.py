from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from unittest.mock import patch
import requests
from rest_framework import status
from rest_framework.test import APITestCase

from translation.services.deepl import DeepLError, deepl_translate_many

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

    @override_settings(USE_DEEPL=True)
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

    @override_settings(USE_DEEPL=False)
    def test_translate_batch_uses_mock_backend_when_disabled(self):
        self.client.force_authenticate(self.user)

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


class DeepLServiceTests(APITestCase):
    @override_settings(DEEPL_AUTH_KEY="test-key", DEEPL_IS_FREE=True)
    @patch("translation.services.deepl._build_session")
    def test_deepl_translate_many_raises_clean_rate_limit_error(self, build_session):
        session = build_session.return_value
        response = session.post.return_value
        response.status_code = 429

        with self.assertRaisesMessage(DeepLError, "DeepL rate limit reached. Please retry later."):
            deepl_translate_many(["Bonjour"], "fr", "nl")

    @override_settings(DEEPL_AUTH_KEY="test-key", DEEPL_IS_FREE=True)
    @patch("translation.services.deepl._build_session")
    def test_deepl_translate_many_raises_clean_timeout_error(self, build_session):
        session = build_session.return_value
        session.post.side_effect = requests.Timeout("boom")

        with self.assertRaisesMessage(DeepLError, "DeepL service timed out."):
            deepl_translate_many(["Bonjour"], "fr", "nl")
