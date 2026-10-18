"""Public API surface hardening (audit M10, M11)."""

import pytest
from django.core.cache import cache
from django.test import override_settings
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.test import APIClient


def test_schema_is_public_outside_prod():
    from config.urls import schema_permission_classes

    with override_settings(API_SCHEMA_PUBLIC=True):
        assert schema_permission_classes() == [AllowAny]


def test_schema_is_admin_only_when_not_public():
    from config.urls import schema_permission_classes

    with override_settings(API_SCHEMA_PUBLIC=False):
        assert schema_permission_classes() == [IsAdminUser]


def test_prod_settings_hide_the_schema():
    """settings_prod cannot be imported in tests (fail-closed env checks), so
    check the default it declares."""
    from pathlib import Path

    source = (Path(__file__).resolve().parents[1] / "settings_prod.py").read_text(encoding="utf-8")
    assert 'API_SCHEMA_PUBLIC = env.bool("API_SCHEMA_PUBLIC", default=False)' in source


@pytest.mark.django_db
def test_token_refresh_is_throttled(monkeypatch):
    from customuser.throttling import TokenRefreshRateThrottle

    monkeypatch.setattr(TokenRefreshRateThrottle, "get_rate", lambda self: "1/min")
    cache.clear()
    client = APIClient()
    first = client.post("/api/v1/token/refresh/", {"refresh": "garbage"}, format="json")
    second = client.post("/api/v1/token/refresh/", {"refresh": "garbage"}, format="json")
    assert first.status_code == 401
    assert second.status_code == 429
    cache.clear()


@pytest.mark.django_db
def test_logout_blacklists_the_refresh_token():
    """Audit M12: the SPA's logout revokes its refresh token server-side."""
    from rest_framework_simplejwt.tokens import RefreshToken

    from customuser.models import CustomUser

    user = CustomUser.objects.create_user(email="logout@example.test", password="x")
    refresh = str(RefreshToken.for_user(user))
    client = APIClient()
    resp = client.post("/api/v1/token/blacklist/", {"refresh": refresh}, format="json")
    assert resp.status_code == 200, resp.content
    again = client.post("/api/v1/token/refresh/", {"refresh": refresh}, format="json")
    assert again.status_code == 401
