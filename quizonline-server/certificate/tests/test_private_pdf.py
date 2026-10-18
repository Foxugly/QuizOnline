"""Certificate PDFs are private: stored outside ``MEDIA_ROOT`` (nginx never
serves them) under an unguessable name, and only reachable through the
authenticated ``/certificate/{id}/pdf/`` action.
"""

from pathlib import Path

import pytest
from django.conf import settings
from rest_framework.test import APIClient

from certificate.models import Certificate
from certificate.tasks import render_certificate_pdf
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
    c = Certificate.objects.create(
        user=learner, course=course,
        certificate_number="QO-2026-0042", verification_token="tok-private",
    )
    render_certificate_pdf(c.id)
    c.refresh_from_db()
    return c


@pytest.mark.django_db
def test_pdf_is_stored_outside_media_root_with_unguessable_name(cert, private_root):
    assert cert.pdf
    assert "QO-2026-0042" not in cert.pdf.name
    path = Path(cert.pdf.path)
    assert path.is_file()
    assert private_root in path.parents
    assert Path(settings.MEDIA_ROOT) not in path.parents
    # uuid4 hex = 32 chars of entropy in the file stem
    assert len(path.stem) >= 32


@pytest.mark.django_db
def test_pdf_url_points_to_authenticated_endpoint(cert, learner):
    resp = _auth(learner).get(f"/api/v1/certificate/{cert.id}/")
    assert resp.status_code == 200
    url = resp.json()["pdf_url"]
    assert "/media/" not in url
    assert url.endswith(f"/api/v1/certificate/{cert.id}/pdf/")


@pytest.mark.django_db
def test_owner_downloads_pdf(cert, learner):
    resp = _auth(learner).get(f"/api/v1/certificate/{cert.id}/pdf/")
    assert resp.status_code == 200
    assert resp["Content-Type"] == "application/pdf"
    assert "attachment" in resp["Content-Disposition"]
    assert "no-store" in resp["Cache-Control"]
    assert b"".join(resp.streaming_content).startswith(b"%PDF")


@pytest.mark.django_db
def test_course_instructor_downloads_pdf(cert, owner, domain):
    assert _auth(owner).get(f"/api/v1/certificate/{cert.id}/pdf/").status_code == 200
    manager = CustomUser.objects.create_user(email="mgr@example.com", password="x")
    domain.managers.add(manager)
    assert _auth(manager).get(f"/api/v1/certificate/{cert.id}/pdf/").status_code == 200


@pytest.mark.django_db
def test_superuser_downloads_pdf(cert):
    root = CustomUser.objects.create_user(
        email="root@example.com", password="x", is_superuser=True, is_staff=True,
    )
    assert _auth(root).get(f"/api/v1/certificate/{cert.id}/pdf/").status_code == 200


@pytest.mark.django_db
def test_other_learner_cannot_download_pdf(cert, domain):
    other = CustomUser.objects.create_user(email="other@example.com", password="x")
    domain.members.add(other)
    assert _auth(other).get(f"/api/v1/certificate/{cert.id}/pdf/").status_code == 404


@pytest.mark.django_db
def test_anonymous_cannot_download_pdf(cert):
    assert APIClient().get(f"/api/v1/certificate/{cert.id}/pdf/").status_code == 401


@pytest.mark.django_db
def test_verify_flow_still_works(cert):
    resp = APIClient().get(f"/api/v1/verify/{cert.verification_token}/")
    assert resp.status_code == 200
    assert resp.json()["valid"] is True
    assert resp.json()["user_display_name"]


@pytest.mark.django_db
def test_migration_moves_public_pdfs_to_private_storage(course, learner, private_root, tmp_path, settings):
    import importlib

    from django.apps import apps as django_apps
    from django.core.files.base import ContentFile
    from django.core.files.storage import default_storage

    settings.MEDIA_ROOT = tmp_path / "media"
    mig = importlib.import_module("certificate.migrations.0004_private_pdf_storage")
    legacy = default_storage.save("lms/certificates/QO-2026-0007.pdf", ContentFile(b"%PDF-legacy"))
    present = Certificate.objects.create(
        user=learner, course=course, certificate_number="QO-2026-0007",
        verification_token="tok-a", pdf=legacy,
    )
    other = CustomUser.objects.create_user(email="o@example.com", password="x")
    missing = Certificate.objects.create(
        user=other, course=course, certificate_number="QO-2026-0008",
        verification_token="tok-b", pdf="lms/certificates/QO-2026-0008.pdf",
    )

    mig.move_public_pdfs(django_apps, None)

    present.refresh_from_db()
    missing.refresh_from_db()
    assert not default_storage.exists(legacy)
    assert "QO-2026-0007" not in present.pdf.name
    assert Path(present.pdf.path).read_bytes() == b"%PDF-legacy"
    assert private_root in Path(present.pdf.path).parents
    assert not missing.pdf
    assert missing.pdf_rendered_at is None


@pytest.mark.django_db
def test_pdf_is_handed_to_nginx_when_x_accel_enabled(cert, learner, settings):
    settings.PRIVATE_MEDIA_X_ACCEL_PREFIX = "/_protected/"
    resp = _auth(learner).get(f"/api/v1/certificate/{cert.id}/pdf/")
    assert resp.status_code == 200
    assert resp["X-Accel-Redirect"] == f"/_protected/{cert.pdf.name}"
    assert resp["Content-Type"] == "application/pdf"
    assert "attachment" in resp["Content-Disposition"]
    assert "QO-2026-0042.pdf" in resp["Content-Disposition"]
    assert resp.content == b""
