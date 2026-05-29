import pytest
from django.core.exceptions import ValidationError

from course.models import Course


@pytest.mark.django_db
def test_course_create_with_valid_language(domain, fr_lang):
    course = Course(
        domain=domain,
        slug="intro-python",
        language=fr_lang,
        level=Course.LEVEL_BEGINNER,
        enrollment_mode=Course.ENROLL_OPEN,
    )
    course.set_current_language("fr")
    course.title = "Introduction au Python"
    course.full_clean()
    course.save()
    assert course.pk is not None


@pytest.mark.django_db
def test_course_rejects_language_outside_domain_allowed(domain, en_lang):
    course = Course(
        domain=domain,
        slug="intro-python",
        language=en_lang,
        level=Course.LEVEL_BEGINNER,
        enrollment_mode=Course.ENROLL_OPEN,
    )
    course.set_current_language("fr")
    course.title = "X"
    with pytest.raises(ValidationError) as exc:
        course.full_clean()
    assert "language" in exc.value.message_dict


@pytest.mark.django_db
def test_course_publish_requires_published_at(domain, fr_lang):
    course = Course(
        domain=domain, slug="x", language=fr_lang,
        is_published=True, published_at=None,
    )
    course.set_current_language("fr")
    course.title = "X"
    with pytest.raises(ValidationError):
        course.full_clean()


@pytest.mark.django_db
def test_course_rejects_when_domain_has_no_allowed_languages(owner, fr_lang):
    from domain.models import Domain
    bare = Domain.objects.create(owner=owner)
    bare.set_current_language("fr")
    bare.name = "Bare"
    bare.save()
    course = Course(domain=bare, slug="x", language=fr_lang)
    course.set_current_language("fr")
    course.title = "X"
    with pytest.raises(ValidationError):
        course.full_clean()