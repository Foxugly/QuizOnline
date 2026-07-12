"""``nb_domain_max`` quota enforcement on POST /api/domain/.

The quota is per-user, set by a superuser via the user-admin form,
default 0. ``DomainViewSet.perform_create`` refuses the request when
the caller already owns ``nb_domain_max`` domains. Superusers bypass.

The frontend topmenu + ``domainAccessGuard`` use the same rule to
gate the Domaines entry, so the menu and the API stay in sync.
"""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from domain.models import Domain
from language.models import Language


User = get_user_model()


@pytest.fixture
def quota_fr_lang(db):
    return Language.objects.create(code="fr", name="Français", active=True)


def _build_payload(lang: Language) -> dict:
    return {
        "active": True,
        "allowed_languages": [lang.id],
        "managers": [],
        "translations": {
            "fr": {"name": "Test domain", "description": "Created in quota test."},
        },
    }


@pytest.mark.django_db
def test_create_domain_blocks_when_quota_is_zero(quota_fr_lang):
    """A user with the default ``nb_domain_max=0`` cannot create any
    domain at all — the safe default."""
    user = User.objects.create_user(email="quota-zero@example.test", password="x")
    assert user.nb_domain_max == 0

    client = APIClient()
    client.force_authenticate(user)
    response = client.post("/api/domain/", _build_payload(quota_fr_lang), format="json")
    assert response.status_code == 403
    assert Domain.objects.filter(owner=user).count() == 0


@pytest.mark.django_db
def test_create_domain_allowed_within_quota(quota_fr_lang):
    """A user with ``nb_domain_max=2`` and 0 owned domains can
    create — quota check passes."""
    user = User.objects.create_user(email="quota-two@example.test", password="x")
    user.nb_domain_max = 2
    user.save(update_fields=["nb_domain_max"])

    client = APIClient()
    client.force_authenticate(user)
    response = client.post("/api/domain/", _build_payload(quota_fr_lang), format="json")
    assert response.status_code == 201
    assert Domain.objects.filter(owner=user).count() == 1


@pytest.mark.django_db
def test_create_domain_blocks_when_quota_exhausted(quota_fr_lang):
    """A user at the cap (owned == quota) cannot create one more —
    the second POST is refused even though the first succeeded."""
    user = User.objects.create_user(email="quota-one@example.test", password="x")
    user.nb_domain_max = 1
    user.save(update_fields=["nb_domain_max"])

    client = APIClient()
    client.force_authenticate(user)
    first = client.post("/api/domain/", _build_payload(quota_fr_lang), format="json")
    assert first.status_code == 201

    second = client.post("/api/domain/", _build_payload(quota_fr_lang), format="json")
    assert second.status_code == 403
    assert Domain.objects.filter(owner=user).count() == 1


@pytest.mark.django_db
def test_superuser_bypasses_quota(quota_fr_lang):
    """Superusers always pass — the quota is a platform-level lever
    for restricting normal users, not the operator."""
    superuser = User.objects.create_superuser(
        email="root@x.com", password="x",
    )
    assert superuser.nb_domain_max == 0

    client = APIClient()
    client.force_authenticate(superuser)
    response = client.post("/api/domain/", _build_payload(quota_fr_lang), format="json")
    assert response.status_code == 201
