import pytest
from django.core.exceptions import ValidationError

from course.models import Section
from lesson.models import Lesson
from course.services import publish_course, unpublish_course, allowed_lang_codes_for_course


@pytest.mark.django_db
def test_allowed_lang_codes_returns_domain_languages(course, fr_lang):
    codes = allowed_lang_codes_for_course(course)
    assert codes == {"fr"}


@pytest.mark.django_db
def test_publish_course_rejects_empty_course(course, owner):
    with pytest.raises(ValidationError):
        publish_course(course=course, by_user=owner)


@pytest.mark.django_db
def test_publish_course_succeeds_with_published_content(course, owner):
    s = Section.objects.create(course=course, order=0, is_published=True)
    Lesson.objects.create(section=s, slug="l", order=0, is_published=True)
    out = publish_course(course=course, by_user=owner)
    assert out.is_published is True
    assert out.published_at is not None


@pytest.mark.django_db
def test_unpublish_course(course, owner):
    s = Section.objects.create(course=course, order=0, is_published=True)
    Lesson.objects.create(section=s, slug="l", order=0, is_published=True)
    publish_course(course=course, by_user=owner)
    unpublish_course(course=course, by_user=owner)
    course.refresh_from_db()
    assert course.is_published is False