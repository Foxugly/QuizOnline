"""Video / embed URLs are restricted to the hosts the CSP lets us frame
(audit M14): YouTube and Vimeo, over HTTPS."""

import pytest
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient

from block.models import Block
from block.url_policy import block_url_errors
from course.models import Section
from lesson.models import Lesson


@pytest.mark.parametrize(
    ("provider", "url", "ok"),
    [
        ("youtube", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", True),
        ("youtube", "https://youtu.be/dQw4w9WgXcQ", True),
        ("vimeo", "https://vimeo.com/123", True),
        ("vimeo", "https://player.vimeo.com/video/123", True),
        ("youtube", "https://evil.example/watch?v=x", False),
        ("youtube", "http://www.youtube.com/watch?v=x", False),
        ("vimeo", "https://www.youtube.com/watch?v=x", False),
        ("upload", "https://cdn.example/video.mp4", True),
        ("youtube", "", True),
    ],
)
def test_video_url_policy(provider, url, ok):
    errors = block_url_errors(video_provider=provider, video_url=url, external_url="")
    assert (not errors) is ok, errors


@pytest.mark.parametrize(
    ("url", "ok"),
    [
        ("https://www.youtube.com/embed/dQw4w9WgXcQ", True),
        ("https://player.vimeo.com/video/1", True),
        ("https://codepen.io/x/embed/y", False),
        ("javascript:alert(1)", False),
        ("https://www.youtube.com.evil.example/embed/x", False),
        ("", True),
    ],
)
def test_embed_url_policy(url, ok):
    errors = block_url_errors(video_provider="", video_url="", external_url=url)
    assert (not errors) is ok, errors


@pytest.mark.django_db
def test_api_rejects_foreign_embed_host(course, owner):
    section = Section.objects.create(course=course, order=0, is_published=True)
    lesson = Lesson.objects.create(section=section, slug="l-url", order=0, is_published=True)
    client = APIClient()
    client.force_authenticate(owner)
    created = client.post(
        "/api/v1/block/",
        {"lesson": lesson.id, "block_type": Block.TYPE_EMBED, "order": 0, "translations": {},
         "external_url": "https://evil.example/frame"},
        format="json",
    )
    assert created.status_code == 400, created.content
    created = client.post(
        "/api/v1/block/",
        {"lesson": lesson.id, "block_type": Block.TYPE_EMBED, "order": 0, "translations": {}},
        format="json",
    )
    assert created.status_code == 201, created.content
    resp = client.patch(
        f"/api/v1/block/{created.json()['id']}/",
        {"external_url": "https://evil.example/frame"},
        format="json",
    )
    assert resp.status_code == 400, resp.content


@pytest.mark.django_db
def test_model_clean_rejects_foreign_video_host(lesson):
    block = Block(target=lesson, block_type=Block.TYPE_VIDEO, order=0,
                  video_provider="youtube", video_url="https://evil.example/v")
    with pytest.raises(ValidationError):
        block.full_clean()
