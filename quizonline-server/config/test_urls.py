import json

from django.test import TestCase
from unittest.mock import patch


class HealthCheckTests(TestCase):
    """The endpoint hits the DB and the cache so it needs a real DB."""

    def test_health_check_returns_ok_and_shape(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        payload = json.loads(response.content)
        self.assertEqual(payload["status"], "ok")
        self.assertTrue(payload["checks"]["db"]["ok"])
        self.assertTrue(payload["checks"]["cache"]["ok"])
        self.assertIsInstance(payload["outbox_pending"], int)

    def test_health_check_degraded_when_db_fails(self):
        with patch("config.views_health._check_db", return_value=(False, "boom")):
            response = self.client.get("/health/")

        self.assertEqual(response.status_code, 503)
        payload = json.loads(response.content)
        self.assertEqual(payload["status"], "degraded")
        self.assertFalse(payload["checks"]["db"]["ok"])
        self.assertEqual(payload["checks"]["db"]["error"], "boom")
        # cache is still tested independently and should still pass
        self.assertTrue(payload["checks"]["cache"]["ok"])

    def test_health_check_degraded_when_cache_fails(self):
        with patch("config.views_health._check_cache", return_value=(False, "no redis")):
            response = self.client.get("/health/")

        self.assertEqual(response.status_code, 503)
        payload = json.loads(response.content)
        self.assertEqual(payload["status"], "degraded")
        self.assertFalse(payload["checks"]["cache"]["ok"])


