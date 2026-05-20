import pytest
from django.core.exceptions import ValidationError

from course.models import Section
from lesson.models import Lesson
from block.models import ContentBlock
from course.services import reorder_sections
from lesson.services import reorder_lessons
from block.services import reorder_blocks


@pytest.mark.django_db
def test_reorder_blocks_swaps_two(lesson):
    a = ContentBlock.objects.create(lesson=lesson, block_type=ContentBlock.TYPE_CODE, code_content="A", order=0)
    b = ContentBlock.objects.create(lesson=lesson, block_type=ContentBlock.TYPE_CODE, code_content="B", order=1)
    reorder_blocks(lesson=lesson, block_ids_in_order=[b.id, a.id])
    a.refresh_from_db()
    b.refresh_from_db()
    assert (a.order, b.order) == (1, 0)


@pytest.mark.django_db
def test_reorder_blocks_rejects_unknown_id(lesson):
    a = ContentBlock.objects.create(lesson=lesson, block_type=ContentBlock.TYPE_CODE, code_content="A", order=0)
    with pytest.raises(ValidationError):
        reorder_blocks(lesson=lesson, block_ids_in_order=[a.id, 999999])


@pytest.mark.django_db
def test_reorder_sections(course):
    s1 = Section.objects.create(course=course, order=0)
    s2 = Section.objects.create(course=course, order=1)
    reorder_sections(course=course, section_ids_in_order=[s2.id, s1.id])
    s1.refresh_from_db()
    s2.refresh_from_db()
    assert (s1.order, s2.order) == (1, 0)


@pytest.mark.django_db
def test_reorder_lessons(course):
    s = Section.objects.create(course=course, order=0)
    l1 = Lesson.objects.create(section=s, slug="a", order=0)
    l2 = Lesson.objects.create(section=s, slug="b", order=1)
    reorder_lessons(section=s, lesson_ids_in_order=[l2.id, l1.id])
    l1.refresh_from_db()
    l2.refresh_from_db()
    assert (l1.order, l2.order) == (1, 0)