import pytest
from django.db import IntegrityError

from lms_catalog.models import Lesson


@pytest.mark.django_db
def test_lesson_create_under_section(section):
    lesson = Lesson(section=section, slug="intro", order=0, estimated_duration=15)
    lesson.set_current_language("fr")
    lesson.title = "Introduction"
    lesson.save()
    assert lesson.pk is not None


@pytest.mark.django_db
def test_lesson_slug_unique_per_section(section):
    Lesson.objects.create(section=section, slug="intro", order=0)
    with pytest.raises(IntegrityError):
        Lesson.objects.create(section=section, slug="intro", order=1)


@pytest.mark.django_db
def test_lesson_order_unique_per_section(section):
    Lesson.objects.create(section=section, slug="a", order=0)
    with pytest.raises(IntegrityError):
        Lesson.objects.create(section=section, slug="b", order=0)
