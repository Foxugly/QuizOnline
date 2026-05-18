import json

from django.test import TestCase
from unittest.mock import patch


class HealthCheckTests(TestCase):
    """The endpoint hits the DB and the cache so it needs a real DB."""

    def test_health_check_returns_ok_and_shape(self):
        # Celery worker pings depend on a live broker; stub the probe
        # so the health endpoint stays deterministic in CI.
        with patch("config.views_health._check_celery", return_value=(True, None)):
            response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        payload = json.loads(response.content)
        self.assertEqual(payload["status"], "ok")
        self.assertTrue(payload["checks"]["db"]["ok"])
        self.assertTrue(payload["checks"]["cache"]["ok"])
        self.assertTrue(payload["checks"]["celery"]["ok"])
        self.assertIsInstance(payload["outbox_pending"], int)
        # ``version`` is always present so operators can confirm which
        # build is running. Defaults to "unknown" when no env-injected
        # release tag is available (dev/local).
        self.assertIn("version", payload)
        self.assertIsInstance(payload["version"], str)

    def test_health_check_does_not_flip_status_on_celery_failure(self):
        """Celery is informational: an unresponsive worker surfaces in
        the payload but must not flip the load-balancer status from
        ``ok`` to ``degraded`` since the web tier still serves requests."""
        with patch("config.views_health._check_celery", return_value=(False, "no workers")):
            response = self.client.get("/health/")
        self.assertEqual(response.status_code, 200)
        payload = json.loads(response.content)
        self.assertEqual(payload["status"], "ok")
        self.assertFalse(payload["checks"]["celery"]["ok"])
        self.assertEqual(payload["checks"]["celery"]["error"], "no workers")

    def test_health_check_surfaces_sentry_release_when_set(self):
        with patch.dict("os.environ", {"SENTRY_RELEASE": "abc1234"}, clear=False), \
             patch("config.views_health._check_celery", return_value=(True, None)):
            response = self.client.get("/health/")
        self.assertEqual(response.status_code, 200)
        payload = json.loads(response.content)
        self.assertEqual(payload["version"], "abc1234")

    def test_health_check_degraded_when_db_fails(self):
        with patch("config.views_health._check_db", return_value=(False, "boom")), \
             patch("config.views_health._check_celery", return_value=(True, None)):
            response = self.client.get("/health/")

        self.assertEqual(response.status_code, 503)
        payload = json.loads(response.content)
        self.assertEqual(payload["status"], "degraded")
        self.assertFalse(payload["checks"]["db"]["ok"])
        self.assertEqual(payload["checks"]["db"]["error"], "boom")
        # cache is still tested independently and should still pass
        self.assertTrue(payload["checks"]["cache"]["ok"])

    def test_health_check_degraded_when_cache_fails(self):
        with patch("config.views_health._check_cache", return_value=(False, "no redis")), \
             patch("config.views_health._check_celery", return_value=(True, None)):
            response = self.client.get("/health/")

        self.assertEqual(response.status_code, 503)
        payload = json.loads(response.content)
        self.assertEqual(payload["status"], "degraded")
        self.assertFalse(payload["checks"]["cache"]["ok"])


