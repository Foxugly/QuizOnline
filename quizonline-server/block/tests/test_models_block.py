import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from block.models import Block


def _block(lesson, block_type, **kwargs):
    b = Block(target=lesson, block_type=block_type, order=0, **kwargs)
    b.set_current_language("fr")
    return b


@pytest.mark.django_db
def test_block_rich_text_valid(lesson):
    b = _block(lesson, Block.TYPE_RICH_TEXT)
    b.rich_text = "<p>Hello</p>"
    b.full_clean()


@pytest.mark.django_db
def test_block_rich_text_missing_text_raises(lesson):
    b = _block(lesson, Block.TYPE_RICH_TEXT)
    with pytest.raises(ValidationError):
        b.full_clean()


@pytest.mark.django_db
def test_block_image_requires_image(lesson):
    b = _block(lesson, Block.TYPE_IMAGE)
    with pytest.raises(ValidationError):
        b.full_clean()


@pytest.mark.django_db
def test_block_video_requires_url_and_provider(lesson):
    b = _block(lesson, Block.TYPE_VIDEO, video_url="https://youtu.be/x")
    with pytest.raises(ValidationError):
        b.full_clean()
    b.video_provider = "youtube"
    b.full_clean()


@pytest.mark.django_db
def test_block_file_requires_file(lesson):
    b = _block(lesson, Block.TYPE_FILE)
    with pytest.raises(ValidationError):
        b.full_clean()


@pytest.mark.django_db
def test_block_quiz_requires_template(lesson):
    b = _block(lesson, Block.TYPE_QUIZ)
    with pytest.raises(ValidationError):
        b.full_clean()


@pytest.mark.django_db
def test_block_quiz_template_domain_must_match(lesson, owner, fr_lang):
    from domain.models import Domain
    other = Domain.objects.create(owner=owner)
    other.set_current_language("fr")
    other.name = "Other"
    other.save()
    other.allowed_languages.add(fr_lang)
    from quiz.models import QuizTemplate
    qt = QuizTemplate(domain=other, title="QT", created_by=owner)
    qt.save()
    b = _block(lesson, Block.TYPE_QUIZ, quiz_template=qt)
    with pytest.raises(ValidationError):
        b.full_clean()


@pytest.mark.django_db
def test_block_callout_requires_text(lesson):
    b = _block(lesson, Block.TYPE_CALLOUT)
    with pytest.raises(ValidationError):
        b.full_clean()
    b.callout_text = "Note"
    b.full_clean()


@pytest.mark.django_db
def test_block_code_requires_content(lesson):
    b = _block(lesson, Block.TYPE_CODE)
    with pytest.raises(ValidationError):
        b.full_clean()
    b.code_content = "print('hi')"
    b.full_clean()


@pytest.mark.django_db
def test_block_embed_requires_external_url(lesson):
    b = _block(lesson, Block.TYPE_EMBED)
    with pytest.raises(ValidationError):
        b.full_clean()
    b.external_url = "https://example.com/x"
    b.full_clean()


@pytest.mark.django_db
def test_block_order_unique_per_lesson(lesson):
    b1 = _block(lesson, Block.TYPE_CODE, code_content="a")
    b1.save()
    with pytest.raises(IntegrityError):
        Block.objects.create(target=lesson, block_type=Block.TYPE_CODE, order=0, code_content="b")


@pytest.mark.django_db
def test_lesson_blocks_reverse_relation(lesson):
    """``lesson.blocks.all()`` walks the GenericRelation declared on Lesson."""
    b = Block.objects.create(target=lesson, block_type=Block.TYPE_CODE, code_content="x", order=0)
    assert list(lesson.blocks.all()) == [b]


@pytest.mark.django_db
def test_block_filter_via_lesson_related_query_name(lesson):
    """``Block.objects.filter(lesson__section__course=...)`` still works
    after the polymorphic refactor thanks to
    ``related_query_name="lesson"`` on the GenericRelation."""
    Block.objects.create(target=lesson, block_type=Block.TYPE_CODE, code_content="x", order=0)
    course = lesson.section.course
    assert Block.objects.filter(lesson__section__course=course).count() == 1
