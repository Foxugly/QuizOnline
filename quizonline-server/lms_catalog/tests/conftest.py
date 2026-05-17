import pytest

from customuser.models import CustomUser
from domain.models import Domain
from language.models import Language
from lms_catalog.models import Course, Section


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


@pytest.fixture
def course(db, domain, fr_lang):
    c = Course(domain=domain, slug="c1", language=fr_lang, level=Course.LEVEL_BEGINNER)
    c.set_current_language("fr")
    c.title = "C1"
    c.save()
    return c


@pytest.fixture
def section(db, course):
    return Section.objects.create(course=course, order=0)
