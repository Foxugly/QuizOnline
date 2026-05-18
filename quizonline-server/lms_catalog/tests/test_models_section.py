import pytest
from django.db import IntegrityError

from lms_catalog.models import Section


@pytest.mark.django_db
def test_section_create_under_course(course):
    s = Section.objects.create(course=course, order=0, is_published=False)
    s.set_current_language("fr")
    s.title = "Module 1"
    s.save()
    assert s.pk is not None


@pytest.mark.django_db
def test_section_order_unique_per_course(course):
    Section.objects.create(course=course, order=0)
    with pytest.raises(IntegrityError):
        Section.objects.create(course=course, order=0)
