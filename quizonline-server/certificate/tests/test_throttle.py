import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_verify_endpoint_uses_anon_throttle(course, settings):
    from customuser.models import CustomUser
    from certificate.models import Certificate
    from certificate.views import _LmsVerifyThrottle

    # Set an extremely tight rate so we can trigger 429 with two calls.
    settings.REST_FRAMEWORK = {
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {
            **settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"],
            "lms_cert_verify": "1/min",
        },
    }
    # DRF throttle classes parse and cache their rate at instantiation, and
    # the AnonRateThrottle base also caches the per-IP history in the Django
    # cache. Force a fresh rate on the class itself and clear any prior
    # request history, otherwise the second call in this test may still
    # succeed because the throttle was already constructed against the test
    # default of 60/min.
    _LmsVerifyThrottle.rate = "1/min"
    _LmsVerifyThrottle.num_requests = 1
    _LmsVerifyThrottle.duration = 60
    from django.core.cache import cache
    cache.clear()

    user = CustomUser.objects.create_user(username="u2", email="u2@x.com", password="x")
    Certificate.objects.create(
        user=user, course=course, certificate_number="QO-T-2", verification_token="tok2",
    )
    c = APIClient()
    r1 = c.get("/api/verify/tok2/")
    r2 = c.get("/api/verify/tok2/")
    assert r1.status_code == 200
    assert r2.status_code == 429

    # Restore class state so we don't poison other tests that may
    # instantiate _LmsVerifyThrottle within the same process.
    _LmsVerifyThrottle.rate = None
    _LmsVerifyThrottle.num_requests = None
    _LmsVerifyThrottle.duration = None
    cache.clear()
