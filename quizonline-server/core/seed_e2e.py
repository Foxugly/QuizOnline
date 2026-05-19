"""Shared helpers for the per-app Playwright fullstack seed commands.

Each ``seed_*_e2e`` management command (quiz, LMS, …) consumes
``admin`` / ``testuser`` / ``domain`` as fixtures. Centralising
their idempotent setup here keeps the per-app commands focused on
the data their own tests care about and prevents drift (two
commands creating the same domain with slightly different
translations would silently break the test setup).

Public helpers:

* :func:`ensure_e2e_languages` — fr / nl / en Language rows.
* :func:`ensure_e2e_admin` — admin user (superuser, password
  ``secret123``).
* :func:`ensure_e2e_testuser` — non-staff testuser.
* :func:`ensure_e2e_domain` — "Sciences" Domain owned by admin
  with testuser as member.
* :func:`upsert_translation` — generic parler translation upsert.
* :func:`file_digest` — sha256 hex digest helper used by media-
  asset seeds.

Constants ``PNG_1X1`` / ``MP4_PLACEHOLDER`` are the byte payloads
the quiz seed uses for fake media assets — exported here so any
future command that needs a placeholder file does not need to
re-base64 the same bytes.
"""

from __future__ import annotations

import base64
import hashlib

from django.contrib.auth import get_user_model

from domain.models import Domain
from language.models import Language


User = get_user_model()

PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO0p5n8AAAAASUVORK5CYII="
)
MP4_PLACEHOLDER = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom"


def file_digest(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def upsert_translation(obj, language_code: str, **fields) -> None:
    """Idempotent parler translation upsert. Avoids the
    ``set_current_language`` + ``save()`` dance every command needs
    when seeding multilingual fixture content."""
    translation_model = obj._parler_meta.root_model
    translation_model.objects.update_or_create(
        master_id=obj.pk,
        language_code=language_code,
        defaults=fields,
    )


def ensure_e2e_languages() -> None:
    """Ensure fr / nl / en ``Language`` rows exist and are active."""
    for code, name in (("fr", "Francais"), ("nl", "Nederlands"), ("en", "English")):
        Language.objects.update_or_create(
            code=code,
            defaults={"name": name, "active": True},
        )


def ensure_e2e_admin():
    """Seed the ``admin`` superuser. Password ``secret123``. Idempotent."""
    admin, _ = User.objects.get_or_create(
        username="admin",
        defaults={
            "email": "admin@example.test",
            "is_staff": True,
            "is_superuser": True,
            "language": "fr",
        },
    )
    admin.email = "admin@example.test"
    admin.is_staff = True
    admin.is_superuser = True
    admin.is_active = True
    admin.language = "fr"
    admin.email_confirmed = True
    admin.must_change_password = False
    admin.set_password("secret123")
    admin.save()
    return admin


def ensure_e2e_testuser():
    """Seed the ``testuser`` non-staff account. Password ``secret123``."""
    testuser, _ = User.objects.get_or_create(
        username="testuser",
        defaults={
            "email": "testuser@example.test",
            "is_staff": False,
            "is_superuser": False,
            "language": "fr",
        },
    )
    testuser.email = "testuser@example.test"
    testuser.is_staff = False
    testuser.is_superuser = False
    testuser.is_active = True
    testuser.language = "fr"
    testuser.email_confirmed = True
    testuser.must_change_password = False
    testuser.set_password("secret123")
    testuser.save()
    return testuser


def ensure_e2e_domain(admin, testuser) -> Domain:
    """Seed the "Sciences" ``Domain``: admin owns + manages, testuser
    is a member. Idempotent on re-runs. Sets the
    ``current_domain`` FK on both users so the SPA defaults to it
    after login."""
    domain = (
        Domain.objects.filter(
            owner=admin,
            translations__language_code="fr",
            translations__name="Sciences",
        )
        .distinct()
        .first()
    )
    if domain is None:
        domain = Domain.objects.create(owner=admin, active=True)
    else:
        domain.owner = admin
        domain.active = True
        domain.save(update_fields=["owner", "active"])
    upsert_translation(domain, "fr", name="Sciences", description="Domaine seede pour Playwright.")
    upsert_translation(domain, "nl", name="Wetenschappen", description="Seedomein voor Playwright.")
    upsert_translation(domain, "en", name="Science", description="Playwright seed domain.")
    domain.allowed_languages.set(Language.objects.filter(code__in=["fr", "nl"]))
    domain.managers.set([admin])
    domain.members.add(testuser)

    admin.current_domain = domain
    admin.save(update_fields=["current_domain"])
    testuser.current_domain = domain
    testuser.save(update_fields=["current_domain"])

    return domain
