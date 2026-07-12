"""SECURITY: certificate revocation is an administrative action. A learner
must NOT be able to revoke their own certificate (no manage check + a queryset
scoped to ``request.user`` previously let them). Only a superuser or an
instructor of the certificate's course may revoke.
"""

import pytest
from rest_framework.test import APIClient

from customuser.models import CustomUser
from certificate.models import Certificate


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def superuser(db):
    return CustomUser.objects.create_user(
        email="root@example.com", password="x",
        is_superuser=True, is_staff=True,
    )


@pytest.fixture
def cert(db, course, learner):
    return Certificate.objects.create(
        user=learner, course=course,
        certificate_number="QO-2026-0001", verification_token="tok-1",
    )


@pytest.mark.django_db
def test_owner_non_staff_cannot_revoke_own_certificate(cert, learner):
    resp = _auth(learner).post(f"/api/certificate/{cert.id}/revoke/", {}, format="json")
    assert resp.status_code == 403
    cert.refresh_from_db()
    assert cert.revoked_at is None


@pytest.mark.django_db
def test_superuser_can_revoke(cert, superuser):
    resp = _auth(superuser).post(
        f"/api/certificate/{cert.id}/revoke/", {"reason": "fraud"}, format="json"
    )
    assert resp.status_code == 200
    cert.refresh_from_db()
    assert cert.revoked_at is not None
    assert cert.revoke_reason == "fraud"


@pytest.mark.django_db
def test_course_instructor_can_revoke(cert, owner):
    # ``owner`` owns the certificate's course's domain -> instructor.
    resp = _auth(owner).post(f"/api/certificate/{cert.id}/revoke/", {}, format="json")
    assert resp.status_code == 200
    cert.refresh_from_db()
    assert cert.revoked_at is not None
