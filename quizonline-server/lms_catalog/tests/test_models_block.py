import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from lms_catalog.models import ContentBlock


def _block(lesson, block_type, **kwargs):
    b = ContentBlock(lesson=lesson, block_type=block_type, order=0, **kwargs)
    b.set_current_language("fr")
    return b


@pytest.mark.django_db
def test_block_rich_text_valid(lesson):
    b = _block(lesson, ContentBlock.TYPE_RICH_TEXT)
    b.rich_text = "<p>Hello</p>"
    b.full_clean()


@pytest.mark.django_db
def test_block_rich_text_missing_text_raises(lesson):
    b = _block(lesson, ContentBlock.TYPE_RICH_TEXT)
    with pytest.raises(ValidationError):
        b.full_clean()


@pytest.mark.django_db
def test_block_image_requires_image(lesson):
    b = _block(lesson, ContentBlock.TYPE_IMAGE)
    with pytest.raises(ValidationError):
        b.full_clean()


@pytest.mark.django_db
def test_block_video_requires_url_and_provider(lesson):
    b = _block(lesson, ContentBlock.TYPE_VIDEO, video_url="https://youtu.be/x")
    with pytest.raises(ValidationError):
        b.full_clean()
    b.video_provider = "youtube"
    b.full_clean()


@pytest.mark.django_db
def test_block_file_requires_file(lesson):
    b = _block(lesson, ContentBlock.TYPE_FILE)
    with pytest.raises(ValidationError):
        b.full_clean()


@pytest.mark.django_db
def test_block_quiz_requires_template(lesson):
    b = _block(lesson, ContentBlock.TYPE_QUIZ)
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
    b = _block(lesson, ContentBlock.TYPE_QUIZ, quiz_template=qt)
    with pytest.raises(ValidationError):
        b.full_clean()


@pytest.mark.django_db
def test_block_callout_requires_text(lesson):
    b = _block(lesson, ContentBlock.TYPE_CALLOUT)
    with pytest.raises(ValidationError):
        b.full_clean()
    b.callout_text = "Note"
    b.full_clean()


@pytest.mark.django_db
def test_block_code_requires_content(lesson):
    b = _block(lesson, ContentBlock.TYPE_CODE)
    with pytest.raises(ValidationError):
        b.full_clean()
    b.code_content = "print('hi')"
    b.full_clean()


@pytest.mark.django_db
def test_block_embed_requires_external_url(lesson):
    b = _block(lesson, ContentBlock.TYPE_EMBED)
    with pytest.raises(ValidationError):
        b.full_clean()
    b.external_url = "https://example.com/x"
    b.full_clean()


@pytest.mark.django_db
def test_block_order_unique_per_lesson(lesson):
    b1 = _block(lesson, ContentBlock.TYPE_CODE, code_content="a")
    b1.save()
    with pytest.raises(IntegrityError):
        ContentBlock.objects.create(lesson=lesson, block_type=ContentBlock.TYPE_CODE, order=0, code_content="b")
