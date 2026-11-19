"""The admin 2FA (admin_2fa/) must not change anything for API users, staff included."""
from unittest.mock import patch

import pytest
from django.core.cache import cache
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework.test import APIClient

from customuser.models import CustomUser

PASSWORD = "Sup3r-Secret!"


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
@pytest.mark.parametrize("enrolled", [False, True])
def test_staff_uses_the_api_with_a_password_only(enrolled):
    user = CustomUser.objects.create_user(email="ops@example.test", password=PASSWORD)
    user.email_confirmed = True
    user.is_staff = True
    user.is_superuser = True
    user.save()
    if enrolled:
        TOTPDevice.objects.create(user=user, name="admin-2fa", confirmed=True)

    client = APIClient()
    login = client.post("/api/v1/token/", {"email": user.email, "password": PASSWORD}, format="json")
    assert login.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.json()['access']}")
    me = client.get("/api/v1/user/me/")
    assert me.status_code == 200
    assert me.json()["email"] == "ops@example.test"


@pytest.mark.django_db
def test_health_stays_public():
    with patch("config.views_health._check_celery", return_value=(True, None)):
        assert APIClient().get("/health/").status_code == 200
