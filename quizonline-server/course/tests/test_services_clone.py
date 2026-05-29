import pytest

from course.models import Section
from lesson.models import Lesson
from block.models import Block
from course.services import clone_course


@pytest.mark.django_db
def test_clone_course_duplicates_structure(course, owner):
    s = Section.objects.create(course=course, order=0, is_published=True)
    s.set_current_language("fr")
    s.title = "S1"
    s.save()
    lesson = Lesson.objects.create(section=s, slug="l1", order=0)
    lesson.set_current_language("fr")
    lesson.title = "L1"
    lesson.save()
    Block.objects.create(target=lesson, block_type=Block.TYPE_CODE, code_content="A", order=0)

    cloned = clone_course(source=course, by_user=owner)

    assert cloned.pk != course.pk
    assert cloned.sections.count() == 1
    assert cloned.sections.first().lessons.count() == 1
    assert cloned.sections.first().lessons.first().blocks.count() == 1
    assert cloned.is_published is False