import pytest
from django.core.exceptions import ValidationError

from block.models import Block
from course.models import Course, Section
from lesson.models import Lesson
from lesson.services import move_lesson


def _lessons(section):
    return list(section.lessons.order_by("order").values_list("slug", "order"))


@pytest.fixture
def two_sections(course):
    s1 = Section.objects.create(course=course, order=0)
    s2 = Section.objects.create(course=course, order=1)
    for i, slug in enumerate(["a", "b", "c"]):
        Lesson.objects.create(section=s1, slug=slug, order=i)
    for i, slug in enumerate(["x", "y"]):
        Lesson.objects.create(section=s2, slug=slug, order=i)
    return s1, s2


@pytest.mark.django_db
def test_move_across_sections_keeps_blocks_and_densifies(two_sections):
    s1, s2 = two_sections
    b = Lesson.objects.get(section=s1, slug="b")
    b.blocks.create(block_type=Block.TYPE_RICH_TEXT, order=0)
    move_lesson(lesson=b, section=s2, position=1)
    assert _lessons(s1) == [("a", 0), ("c", 1)]
    assert _lessons(s2) == [("x", 0), ("b", 1), ("y", 2)]
    assert Block.objects.filter(target_object_id=b.id).count() == 1


@pytest.mark.django_db
@pytest.mark.parametrize("position,expected", [
    (0, [("b", 0), ("x", 1), ("y", 2)]),
    (99, [("x", 0), ("y", 1), ("b", 2)]),
])
def test_move_position_is_clamped(two_sections, position, expected):
    s1, s2 = two_sections
    move_lesson(lesson=Lesson.objects.get(section=s1, slug="b"), section=s2, position=position)
    assert _lessons(s2) == expected


@pytest.mark.django_db
def test_move_makes_slug_unique_in_target(two_sections):
    s1, s2 = two_sections
    Lesson.objects.create(section=s2, slug="a", order=2)
    move_lesson(lesson=Lesson.objects.get(section=s1, slug="a"), section=s2, position=3)
    assert [slug for slug, _ in _lessons(s2)] == ["x", "y", "a", "a-2"]


@pytest.mark.django_db
def test_move_within_same_section_reorders(two_sections):
    s1, _ = two_sections
    move_lesson(lesson=Lesson.objects.get(section=s1, slug="a"), section=s1, position=2)
    assert _lessons(s1) == [("b", 0), ("c", 1), ("a", 2)]


@pytest.mark.django_db
def test_move_to_other_course_is_rejected(two_sections, domain, fr_lang):
    s1, _ = two_sections
    other = Course(domain=domain, slug="other", language=fr_lang, level=Course.LEVEL_BEGINNER)
    other.set_current_language("fr")
    other.title = "Other"
    other.save()
    foreign = Section.objects.create(course=other, order=0)
    with pytest.raises(ValidationError):
        move_lesson(lesson=Lesson.objects.get(section=s1, slug="a"), section=foreign, position=0)
