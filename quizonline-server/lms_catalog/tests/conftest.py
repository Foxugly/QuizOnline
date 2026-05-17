import pytest

from customuser.models import CustomUser
from domain.models import Domain
from language.models import Language


@pytest.fixture
def fr_lang(db):
    return Language.objects.create(code="fr", name="French")


@pytest.fixture
def en_lang(db):
    return Language.objects.create(code="en", name="English")


@pytest.fixture
def owner(db):
    return CustomUser.objects.create_user(username="owner", email="owner@example.com", password="x")


@pytest.fixture
def domain(db, owner, fr_lang):
    d = Domain.objects.create(owner=owner)
    d.set_current_language("fr")
    d.name = "Test Domain"
    d.save()
    d.allowed_languages.add(fr_lang)
    return d
