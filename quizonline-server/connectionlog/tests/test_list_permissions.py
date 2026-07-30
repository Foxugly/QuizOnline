import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from connectionlog.models import ConnectionEvent


@pytest.mark.django_db
def test_list_is_superuser_only():
    U = get_user_model()
    normal = U.objects.create(email="n@x.com")
    su = U.objects.create(email="s@x.com", is_superuser=True, is_staff=True)
    ConnectionEvent.objects.create(account_email="n@x.com", login_method="password")
    c = APIClient()
    c.force_authenticate(normal)
    assert c.get("/api/v1/connection-log/").status_code == 403
    c.force_authenticate(su)
    resp = c.get("/api/v1/connection-log/")
    assert resp.status_code == 200
    assert len(resp.data["results"]) == 1


@pytest.mark.django_db
def test_list_daterange_filter():
    from datetime import timedelta

    from django.utils import timezone
    U = get_user_model()
    su = U.objects.create(email="s@x.com", is_superuser=True)
    old = ConnectionEvent.objects.create(account_email="a", login_method="password")
    ConnectionEvent.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=10))
    ConnectionEvent.objects.create(account_email="b", login_method="password")  # now
    c = APIClient()
    c.force_authenticate(su)
    start = (timezone.now() - timedelta(days=1)).date().isoformat()
    resp = c.get(f"/api/v1/connection-log/?start={start}")
    assert resp.status_code == 200
    assert [r["account_email"] for r in resp.data["results"]] == ["b"]


@pytest.mark.django_db
def test_list_daterange_end_is_inclusive():
    """The ``end`` bound includes events from that whole day (implemented as
    ``created_at < end + 1 day`` so the index stays usable)."""
    from datetime import timedelta

    from django.utils import timezone
    U = get_user_model()
    su = U.objects.create(email="s2@x.com", is_superuser=True)
    ConnectionEvent.objects.create(account_email="today", login_method="password")  # now
    c = APIClient()
    c.force_authenticate(su)

    today = timezone.localdate().isoformat()
    resp = c.get(f"/api/v1/connection-log/?end={today}")
    assert resp.status_code == 200
    assert "today" in [r["account_email"] for r in resp.data["results"]]

    yesterday = (timezone.localdate() - timedelta(days=1)).isoformat()
    resp2 = c.get(f"/api/v1/connection-log/?end={yesterday}")
    assert "today" not in [r["account_email"] for r in resp2.data["results"]]
