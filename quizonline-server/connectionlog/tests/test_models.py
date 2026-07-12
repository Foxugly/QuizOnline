import pytest
from django.contrib.auth import get_user_model
from connectionlog.models import ConnectionEvent


@pytest.mark.django_db
def test_connection_event_minimal_create():
    user = get_user_model().objects.create(email="a@b.com")
    ev = ConnectionEvent.objects.create(
        user=user, account_email="a@b.com", login_method="password", ip="1.2.3.4",
    )
    assert ev.pk is not None
    assert ev.created_at is not None
    # deleting the user keeps the row (SET_NULL) + the email snapshot
    user.delete()
    ev.refresh_from_db()
    assert ev.user is None
    assert ev.account_email == "a@b.com"
