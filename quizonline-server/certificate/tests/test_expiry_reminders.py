import secrets
from datetime import timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone

from customuser.models import CustomUser
from certificate.models import Certificate
from certificate.tasks import send_certificate_expiry_reminders


def _make_cert(user, course, *, expires_in_days):
    now = timezone.now()
    return Certificate.objects.create(
        user=user,
        course=course,
        certificate_number=f"QO-{secrets.token_hex(6)}",
        verification_token=secrets.token_urlsafe(16),
        expires_at=None if expires_in_days is None else now + timedelta(days=expires_in_days),
    )


@pytest.mark.django_db
@patch("certificate.tasks.notify_certificate_expiring")
def test_30d_reminder_sent_once_and_is_idempotent(mock_notify, course, learner):
    cert = _make_cert(learner, course, expires_in_days=20)  # (7, 30] band

    assert send_certificate_expiry_reminders() == 1
    mock_notify.assert_called_once()
    cert.refresh_from_db()
    assert cert.expiry_reminder_30d_sent_at is not None
    assert cert.expiry_reminder_7d_sent_at is None

    # Second run: the 30d stamp excludes it — nothing re-sent.
    mock_notify.reset_mock()
    assert send_certificate_expiry_reminders() == 0
    mock_notify.assert_not_called()


@pytest.mark.django_db
@patch("certificate.tasks.notify_certificate_expiring")
def test_7d_reminder_band(mock_notify, course, learner):
    cert = _make_cert(learner, course, expires_in_days=3)  # (0, 7] band

    assert send_certificate_expiry_reminders() == 1
    cert.refresh_from_db()
    assert cert.expiry_reminder_7d_sent_at is not None
    # 3 days out lands in the 7d band, not the 30d band.
    assert cert.expiry_reminder_30d_sent_at is None
    _, kwargs = mock_notify.call_args
    assert kwargs["days"] == 3


@pytest.mark.django_db
@patch("certificate.tasks.notify_certificate_expiring")
def test_skips_lifetime_expired_and_far_future(mock_notify, course, learner):
    _make_cert(learner, course, expires_in_days=None)  # lifetime → never reminded

    far = CustomUser.objects.create_user(email="far@x.com", password="x")
    _make_cert(far, course, expires_in_days=90)  # outside both bands

    expired_user = CustomUser.objects.create_user(email="exp@x.com", password="x")
    _make_cert(expired_user, course, expires_in_days=-2)  # already expired

    assert send_certificate_expiry_reminders() == 0
    mock_notify.assert_not_called()


@pytest.mark.django_db
@patch("certificate.tasks.notify_certificate_expiring")
def test_revoked_certificate_not_reminded(mock_notify, course, learner):
    cert = _make_cert(learner, course, expires_in_days=10)
    cert.revoked_at = timezone.now()
    cert.save(update_fields=["revoked_at"])

    assert send_certificate_expiry_reminders() == 0
    mock_notify.assert_not_called()
