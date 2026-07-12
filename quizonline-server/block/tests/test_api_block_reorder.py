"""Tests for the unified ``POST /api/block/reorder/`` endpoint.

The endpoint accepts a ``(host_type, host_id, ids, block_role)``
payload and runs the two-phase reorder primitive against the
matching block list. Earlier phases had a lesson-only reorder action
on ``LessonViewSet`` and fell back to per-block PATCH for Question /
AnswerOption hosts; the unified endpoint replaces both paths.
"""

from __future__ import annotations

import pytest
from django.contrib.contenttypes.models import ContentType
from rest_framework.test import APIClient

from block.models import Block


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def question(db, domain):
    from question.models import Question
    q = Question.objects.create(domain=domain)
    q.set_current_language("fr")
    q.title = "Q1"
    q.save()
    return q


@pytest.fixture
def answer_option(db, question):
    from question.models import AnswerOption
    return AnswerOption.objects.create(question=question, is_correct=True, sort_order=0)


def _make_block(host, *, order: int, role: str = Block.ROLE_BODY) -> Block:
    ct = ContentType.objects.get_for_model(type(host))
    return Block.objects.create(
        target_content_type=ct,
        target_object_id=host.id,
        block_type=Block.TYPE_RICH_TEXT,
        block_role=role,
        order=order,
    )


@pytest.mark.django_db
def test_reorder_lesson_blocks(lesson, owner):
    a, b, c = (
        _make_block(lesson, order=0),
        _make_block(lesson, order=1),
        _make_block(lesson, order=2),
    )
    client = _auth(owner)
    response = client.post(
        "/api/block/reorder/",
        {"host_type": "lesson", "host_id": lesson.id, "ids": [c.id, a.id, b.id]},
        format="json",
    )
    assert response.status_code == 200, response.content
    a.refresh_from_db()
    b.refresh_from_db()
    c.refresh_from_db()
    assert (c.order, a.order, b.order) == (0, 1, 2)


@pytest.mark.django_db
def test_reorder_question_prompt_blocks_respects_role(question, owner):
    """Reorder must stay scoped to the requested ``block_role`` — an
    explanation block at the same host MUST NOT be touched."""
    p1 = _make_block(question, order=0, role=Block.ROLE_PROMPT)
    p2 = _make_block(question, order=1, role=Block.ROLE_PROMPT)
    e1 = _make_block(question, order=0, role=Block.ROLE_EXPLANATION)

    client = _auth(owner)
    response = client.post(
        "/api/block/reorder/",
        {
            "host_type": "question", "host_id": question.id,
            "ids": [p2.id, p1.id], "block_role": "prompt",
        },
        format="json",
    )
    assert response.status_code == 200, response.content
    p1.refresh_from_db()
    p2.refresh_from_db()
    e1.refresh_from_db()
    assert (p2.order, p1.order) == (0, 1)
    # The explanation block's order is untouched.
    assert e1.order == 0


@pytest.mark.django_db
def test_reorder_answer_option_blocks(answer_option, owner):
    a, b = (
        _make_block(answer_option, order=0),
        _make_block(answer_option, order=1),
    )
    client = _auth(owner)
    response = client.post(
        "/api/block/reorder/",
        {"host_type": "answer_option", "host_id": answer_option.id, "ids": [b.id, a.id]},
        format="json",
    )
    assert response.status_code == 200, response.content
    a.refresh_from_db()
    b.refresh_from_db()
    assert (b.order, a.order) == (0, 1)


@pytest.mark.django_db
def test_reorder_rejects_mismatched_ids(question, owner):
    """If the payload's ids don't exactly match the host's blocks for
    that role, refuse the call. Prevents an accidental cross-host or
    cross-role renumbering."""
    p1 = _make_block(question, order=0, role=Block.ROLE_PROMPT)
    _make_block(question, order=1, role=Block.ROLE_PROMPT)

    client = _auth(owner)
    response = client.post(
        "/api/block/reorder/",
        {
            "host_type": "question", "host_id": question.id,
            "ids": [p1.id], "block_role": "prompt",  # missing p2
        },
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_reorder_rejects_unknown_host_type(owner):
    client = _auth(owner)
    response = client.post(
        "/api/block/reorder/",
        {"host_type": "course", "host_id": 1, "ids": [1]},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_reorder_blocks_non_instructor(question, domain):
    """A learner of the domain cannot reorder blocks."""
    from customuser.models import CustomUser
    plain_member = CustomUser.objects.create_user(email="plain@example.test", password="x")
    domain.members.add(plain_member)
    p1 = _make_block(question, order=0, role=Block.ROLE_PROMPT)
    p2 = _make_block(question, order=1, role=Block.ROLE_PROMPT)
    client = _auth(plain_member)
    response = client.post(
        "/api/block/reorder/",
        {
            "host_type": "question", "host_id": question.id,
            "ids": [p2.id, p1.id], "block_role": "prompt",
        },
        format="json",
    )
    assert response.status_code in (401, 403)
