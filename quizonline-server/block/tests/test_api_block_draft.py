"""Tests for the draft-friendly ``POST /api/block/`` flow.

The frontend block-builder UX creates a block as soon as the author
clicks "+ Add <type>" — at which point the payload genuinely has no
per-type content yet — and only fills it in afterwards via debounced
PATCH calls. ``BlockSerializer.validate()`` must therefore accept an
empty draft on CREATE while still enforcing the per-type
``Block.clean()`` validators on UPDATE.

These tests pin that contract end-to-end through the DRF view so the
loop "create empty → patch content" cannot regress to a 400 again.
"""

import pytest
from rest_framework.test import APIClient

from course.models import Section
from lesson.models import Lesson
from block.models import Block


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def visible_lesson(db, course):
    """A lesson that ``BlockQuerySet.visible_to`` will surface for the owner.

    The default ``lesson`` fixture sits on an unpublished section with
    ``is_published=False`` and ``is_preview=False`` — fine for raw-model
    tests, but ``LessonQuerySet.visible_to`` filters those out for every
    user except Django superusers (see ``querysets.py``). We need the
    block routes to resolve a lesson the owner is allowed to mutate, so
    we materialize a published lesson here.
    """
    section = Section.objects.create(course=course, order=0, is_published=True)
    return Lesson.objects.create(section=section, slug="l-vis", order=0, is_published=True)


def _draft_payload(lesson, block_type, order=0):
    """The exact "click + Add" payload the frontend posts to create an empty block."""
    return {
        "lesson": lesson.id,
        "block_type": block_type,
        "order": order,
        "translations": {},
    }


@pytest.mark.django_db
def test_create_rich_text_block_with_empty_payload_succeeds(visible_lesson, owner):
    """POST with the minimal draft payload (no per-type content) must 201."""
    r = _auth(owner).post(
        "/api/block/",
        _draft_payload(visible_lesson, Block.TYPE_RICH_TEXT),
        format="json",
    )
    assert r.status_code == 201, r.content
    assert r.data["block_type"] == Block.TYPE_RICH_TEXT
    assert r.data["order"] == 0


@pytest.mark.django_db
def test_create_code_block_with_empty_payload_succeeds(visible_lesson, owner):
    """Same draft flow for a different block type to cover the pattern."""
    r = _auth(owner).post(
        "/api/block/",
        _draft_payload(visible_lesson, Block.TYPE_CODE),
        format="json",
    )
    assert r.status_code == 201, r.content
    assert r.data["block_type"] == Block.TYPE_CODE


@pytest.mark.django_db
def test_create_block_succeeds_when_domain_has_no_allowed_languages(visible_lesson, owner, course):
    """An author may legitimately add a draft block on a course whose
    domain has not yet had any ``allowed_languages`` configured — the
    draft payload carries an empty ``translations`` dict, so the
    allowed-language filter has nothing to enforce. This used to 400
    with "Domain has no allowed_languages configured." even though
    the request was not trying to set any translation; covered now.
    """
    course.domain.allowed_languages.clear()
    r = _auth(owner).post(
        "/api/block/",
        _draft_payload(visible_lesson, Block.TYPE_RICH_TEXT),
        format="json",
    )
    assert r.status_code == 201, r.content


@pytest.mark.django_db
def test_patch_rich_text_block_with_empty_translations_still_fails(visible_lesson, owner):
    """PATCHing back an empty translation map keeps the per-type check active."""
    create = _auth(owner).post(
        "/api/block/",
        _draft_payload(visible_lesson, Block.TYPE_RICH_TEXT),
        format="json",
    )
    assert create.status_code == 201, create.content
    block_id = create.data["id"]

    r = _auth(owner).patch(
        f"/api/block/{block_id}/",
        {"translations": {"fr": {"rich_text": ""}}},
        format="json",
    )
    assert r.status_code == 400, r.content


@pytest.mark.django_db
def test_patch_rich_text_block_with_content_succeeds(visible_lesson, owner):
    """The end-to-end "create empty -> patch real content" flow."""
    create = _auth(owner).post(
        "/api/block/",
        _draft_payload(visible_lesson, Block.TYPE_RICH_TEXT),
        format="json",
    )
    assert create.status_code == 201, create.content
    block_id = create.data["id"]

    r = _auth(owner).patch(
        f"/api/block/{block_id}/",
        {"translations": {"fr": {"rich_text": "<p>hi</p>"}}},
        format="json",
    )
    assert r.status_code == 200, r.content
    block = Block.objects.get(pk=block_id)
    block.set_current_language("fr")
    assert block.rich_text == "<p>hi</p>"


@pytest.mark.django_db
def test_patch_code_block_with_content_succeeds(visible_lesson, owner):
    """Mirror the rich_text flow on a non-translated payload field."""
    create = _auth(owner).post(
        "/api/block/",
        _draft_payload(visible_lesson, Block.TYPE_CODE),
        format="json",
    )
    assert create.status_code == 201, create.content
    block_id = create.data["id"]

    r = _auth(owner).patch(
        f"/api/block/{block_id}/",
        {"code_content": "print('hi')", "code_language": "python"},
        format="json",
    )
    assert r.status_code == 200, r.content
    block = Block.objects.get(pk=block_id)
    assert block.code_content == "print('hi')"
    assert block.code_language == "python"


@pytest.mark.django_db
def test_create_assigns_consecutive_order_when_client_sends_colliding_values(visible_lesson, owner):
    """The client picks ``order = max(siblings.order) + 1`` from its local
    snapshot, which races against pending creates / deletes and used to
    crash with ``uniq_block_order_per_target_role`` integrity errors. The
    server now ignores the client-supplied order and assigns the next
    value atomically under a row lock — three POSTs with the same
    ``order=0`` payload must each get a distinct, consecutive order.
    """
    client = _auth(owner)
    received_orders = []
    for _ in range(3):
        r = client.post(
            "/api/block/",
            _draft_payload(visible_lesson, Block.TYPE_RICH_TEXT, order=0),
            format="json",
        )
        assert r.status_code == 201, r.content
        received_orders.append(r.data["order"])
    assert received_orders == [0, 1, 2]
