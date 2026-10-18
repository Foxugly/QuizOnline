"""GDPR erasure + retention.

- Deleting an account that holds certificates must not 500: the
  certificates are kept (so issued ones stay verifiable) but detached from
  the account, keeping only the holder-name snapshot printed on the PDF.
- Login logs (IP, geo, UA) go with the account.
- A beat task purges old login logs and old outbound emails.
"""

from datetime import timedelta

import pytest
from django.conf import settings
from django.utils import timezone
from rest_framework.test import APIClient

from certificate.models import Certificate
from certificate.services import issue_certificate_if_eligible
from connectionlog.models import ConnectionEvent
from core.models import OutboundEmail
from customuser.models import CustomUser


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def private_root(tmp_path, settings):
    settings.PRIVATE_MEDIA_ROOT = tmp_path / "private"
    return settings.PRIVATE_MEDIA_ROOT


@pytest.fixture
def cert(db, course, learner, private_root):
    learner.first_name = "Ada"
    learner.last_name = "Lovelace"
    learner.save()
    return Certificate.objects.create(
        user=learner, course=course, holder_name="Ada Lovelace",
        certificate_number="QO-2026-0100", verification_token="tok-gdpr",
    )


@pytest.mark.django_db
def test_issue_snapshots_holder_name(course, learner, private_root, monkeypatch):
    from certificate import services

    monkeypatch.setattr(services, "_course_completed", lambda u, c: True)
    learner.first_name = "Grace"
    learner.save()
    issued = issue_certificate_if_eligible(user=learner, course=course)
    assert issued.holder_name == "Grace"


@pytest.mark.django_db
def test_holder_name_never_keeps_the_email(course, learner, private_root):
    cert = Certificate.objects.create(
        user=learner, course=course, certificate_number="QO-2026-0101",
        verification_token="tok-noname",
    )
    learner.delete()
    cert.refresh_from_db()
    assert cert.holder_name == ""


@pytest.mark.django_db
def test_certified_learner_can_delete_account(cert, learner):
    resp = _auth(learner).delete("/api/v1/user/me/")
    assert resp.status_code == 204
    assert not CustomUser.objects.filter(pk=learner.pk).exists()
    cert.refresh_from_db()
    assert cert.user_id is None
    assert cert.holder_name == "Ada Lovelace"


@pytest.mark.django_db
def test_certificate_stays_verifiable_after_account_deletion(cert, learner):
    _auth(learner).delete("/api/v1/user/me/")
    resp = APIClient().get(f"/api/v1/verify/{cert.verification_token}/")
    assert resp.status_code == 200
    assert resp.json()["valid"] is True
    assert resp.json()["user_display_name"] == "Ada Lovelace"


@pytest.mark.django_db
def test_detached_certificate_pdf_still_renders(cert, learner):
    from certificate.tasks import render_certificate_pdf

    _auth(learner).delete("/api/v1/user/me/")
    render_certificate_pdf(cert.id)
    cert.refresh_from_db()
    assert cert.pdf


@pytest.mark.django_db
def test_expiry_reminders_skip_detached_certificates(cert, learner):
    from certificate.tasks import send_certificate_expiry_reminders

    Certificate.objects.filter(pk=cert.pk).update(expires_at=timezone.now() + timedelta(days=5))
    learner.delete()
    assert send_certificate_expiry_reminders() == 0


@pytest.mark.django_db
def test_login_logs_deleted_with_account(learner):
    ConnectionEvent.objects.create(user=learner, account_email=learner.email, ip="203.0.113.7")
    resp = _auth(learner).delete("/api/v1/user/me/")
    assert resp.status_code == 204
    assert not ConnectionEvent.objects.exists()


@pytest.mark.django_db
def test_retention_purges_old_login_logs_and_emails(learner):
    from core.tasks import purge_expired_personal_data

    now = timezone.now()
    old_ev = ConnectionEvent.objects.create(user=learner, account_email=learner.email)
    new_ev = ConnectionEvent.objects.create(user=learner, account_email=learner.email)
    ConnectionEvent.objects.filter(pk=old_ev.pk).update(created_at=now - timedelta(days=366))
    ConnectionEvent.objects.filter(pk=new_ev.pk).update(created_at=now - timedelta(days=300))

    old_mail = OutboundEmail.objects.create(subject="reset", body="link", recipients=["a@x.com"])
    new_mail = OutboundEmail.objects.create(subject="reset", body="link", recipients=["a@x.com"])
    OutboundEmail.objects.filter(pk=old_mail.pk).update(created_at=now - timedelta(days=31))
    OutboundEmail.objects.filter(pk=new_mail.pk).update(created_at=now - timedelta(days=29))

    result = purge_expired_personal_data()

    assert list(ConnectionEvent.objects.values_list("pk", flat=True)) == [new_ev.pk]
    assert list(OutboundEmail.objects.values_list("pk", flat=True)) == [new_mail.pk]
    assert result["connection_events"] == 1
    assert result["outbound_emails"] == 1


def test_retention_task_is_scheduled():
    entries = [e["task"] for e in settings.CELERY_BEAT_SCHEDULE.values()]
    assert "core.tasks.purge_expired_personal_data" in entries
    assert settings.RETENTION_CONNECTION_EVENT_DAYS == 365
    assert settings.RETENTION_OUTBOUND_EMAIL_DAYS == 30
