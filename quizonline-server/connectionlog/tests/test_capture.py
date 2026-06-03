import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from connectionlog.models import ConnectionEvent


@pytest.mark.django_db
def test_capture_records_event_with_server_fields():
    user = get_user_model().objects.create(email="u@x.com", username="u@x.com")
    c = APIClient()
    c.force_authenticate(user)
    resp = c.post("/api/connection-log/", {
        "login_method": "password",
        "local_time": "2026-06-03 10:00 +02:00",
        "browser_language": "fr-FR",
        "timezone": "Europe/Brussels",
        "screen_width": 1920, "screen_height": 1080,
        "online": True,
    }, format="json", HTTP_USER_AGENT="Mozilla/5.0 (Windows NT 10.0) Chrome/124.0")
    assert resp.status_code == 201
    ev = ConnectionEvent.objects.get()
    assert ev.user == user and ev.account_email == "u@x.com"   # account derived server-side
    assert "Chrome" in ev.browser                              # UA parsed server-side
    assert ev.timezone == "Europe/Brussels"                    # client field stored


@pytest.mark.django_db
def test_capture_requires_auth():
    resp = APIClient().post("/api/connection-log/", {}, format="json")
    assert resp.status_code in (401, 403)


@pytest.mark.django_db
def test_capture_ip_is_not_spoofable_via_xff():
    """A client-forged left-most X-Forwarded-For token must be ignored; the
    recorded IP is nginx's appended real peer (right-most token)."""
    user = get_user_model().objects.create(email="u@x.com", username="u@x.com")
    c = APIClient()
    c.force_authenticate(user)
    # client spoofs 1.2.3.4; nginx appends the real peer 9.9.9.9 as last token
    resp = c.post(
        "/api/connection-log/", {"login_method": "password"}, format="json",
        HTTP_X_FORWARDED_FOR="1.2.3.4, 9.9.9.9",
    )
    assert resp.status_code == 201
    assert ConnectionEvent.objects.get().ip == "9.9.9.9"


@pytest.mark.django_db
def test_capture_prefers_x_real_ip():
    user = get_user_model().objects.create(email="u@x.com", username="u@x.com")
    c = APIClient()
    c.force_authenticate(user)
    resp = c.post(
        "/api/connection-log/", {"login_method": "password"}, format="json",
        HTTP_X_REAL_IP="9.9.9.9", HTTP_X_FORWARDED_FOR="1.2.3.4",
    )
    assert resp.status_code == 201
    assert ConnectionEvent.objects.get().ip == "9.9.9.9"
