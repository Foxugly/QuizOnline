"""Tests for the Question / AnswerOption-hosted block flow.

Phase 3.5 extends :class:`block.serializers.BlockSerializer` to accept
``question`` and ``answer_option`` host writes on top of the existing
``lesson`` host. The question editor frontend now drives the prompt,
explanation, and per-answer block lists through ``/api/block/``,
exactly the way the lesson editor does for lesson body blocks.

These tests pin the contract end-to-end:

* ``POST /api/block/`` with ``{"question": <id>, "block_role": "prompt", ...}``
  creates a Question-hosted prompt block (and similarly for
  ``explanation`` and ``answer_option`` hosts).
* The read response surfaces the matching ``question`` / ``answer_option``
  PK while the other host fields stay ``null``.
* Permission gating: only domain managers may write; outsiders get 403.
"""

from __future__ import annotations

import pytest
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


@pytest.mark.django_db
def test_create_question_prompt_block_succeeds(question, owner):
    """POST with ``question`` host + ``block_role=prompt`` creates a prompt block."""
    r = _auth(owner).post(
        "/api/block/",
        {
            "question": question.id,
            "block_type": Block.TYPE_RICH_TEXT,
            "block_role": Block.ROLE_PROMPT,
            "order": 0,
            "translations": {},
        },
        format="json",
    )
    assert r.status_code == 201, r.content
    assert r.data["block_type"] == Block.TYPE_RICH_TEXT
    assert r.data["block_role"] == Block.ROLE_PROMPT
    assert r.data["question"] == question.id
    assert r.data["lesson"] is None
    assert r.data["answer_option"] is None
    # And the block is actually attached to the Question via GFK.
    assert len(question.prompt_blocks()) == 1


@pytest.mark.django_db
def test_create_question_explanation_block_succeeds(question, owner):
    """``block_role=explanation`` reaches the right Question.explanation_blocks() bucket."""
    r = _auth(owner).post(
        "/api/block/",
        {
            "question": question.id,
            "block_type": Block.TYPE_CALLOUT,
            "block_role": Block.ROLE_EXPLANATION,
            "order": 0,
            "translations": {},
        },
        format="json",
    )
    assert r.status_code == 201, r.content
    assert len(question.explanation_blocks()) == 1
    assert len(question.prompt_blocks()) == 0


@pytest.mark.django_db
def test_create_answer_option_block_succeeds(answer_option, owner):
    """POST with ``answer_option`` host creates a body block on the option."""
    r = _auth(owner).post(
        "/api/block/",
        {
            "answer_option": answer_option.id,
            "block_type": Block.TYPE_RICH_TEXT,
            "order": 0,
            "translations": {},
        },
        format="json",
    )
    assert r.status_code == 201, r.content
    assert r.data["answer_option"] == answer_option.id
    assert r.data["question"] is None
    assert r.data["lesson"] is None
    assert answer_option.blocks.count() == 1


@pytest.mark.django_db
def test_create_block_rejects_when_no_host_provided(owner):
    """Empty host payload must 400."""
    r = _auth(owner).post(
        "/api/block/",
        {
            "block_type": Block.TYPE_RICH_TEXT,
            "order": 0,
            "translations": {},
        },
        format="json",
    )
    # The IsLmsInstructorOrReadOnly check fires first and returns 403
    # because the payload doesn't reference a manageable parent. Either
    # 400 (validation) or 403 (permission) is acceptable — both close
    # the door on the empty-host case. We pin "not 201" to keep the
    # behaviour contract loose but correct.
    assert r.status_code in (400, 403), r.content


@pytest.mark.django_db
def test_create_block_rejects_when_multiple_hosts_provided(question, owner, visible_lesson):
    """Setting both ``question`` and ``lesson`` must 400."""
    r = _auth(owner).post(
        "/api/block/",
        {
            "lesson": visible_lesson.id,
            "question": question.id,
            "block_type": Block.TYPE_RICH_TEXT,
            "order": 0,
            "translations": {},
        },
        format="json",
    )
    assert r.status_code == 400, r.content


@pytest.fixture
def visible_lesson(db, course):
    from course.models import Section
    from lesson.models import Lesson
    section = Section.objects.create(course=course, order=0, is_published=True)
    return Lesson.objects.create(section=section, slug="l-vis", order=0, is_published=True)


@pytest.mark.django_db
def test_outsider_cannot_create_question_block(question, db):
    """Users with no manage rights on the question's domain get 403."""
    from customuser.models import CustomUser
    outsider = CustomUser.objects.create_user(
        email="o@example.com", password="x"
    )
    r = _auth(outsider).post(
        "/api/block/",
        {
            "question": question.id,
            "block_type": Block.TYPE_RICH_TEXT,
            "block_role": Block.ROLE_PROMPT,
            "order": 0,
            "translations": {},
        },
        format="json",
    )
    assert r.status_code == 403, r.content


@pytest.mark.django_db
def test_patch_question_block_persists_translation(question, owner, en_lang, domain):
    """PATCH with a fresh rich_text translation must reach the DB."""
    domain.allowed_languages.add(en_lang)
    r = _auth(owner).post(
        "/api/block/",
        {
            "question": question.id,
            "block_type": Block.TYPE_RICH_TEXT,
            "block_role": Block.ROLE_PROMPT,
            "order": 0,
            "translations": {},
        },
        format="json",
    )
    assert r.status_code == 201, r.content
    block_id = r.data["id"]

    r2 = _auth(owner).patch(
        f"/api/block/{block_id}/",
        {"translations": {"fr": {"rich_text": "<p>Bonjour</p>"}}},
        format="json",
    )
    assert r2.status_code == 200, r2.content
    block = Block.objects.get(pk=block_id)
    block.set_current_language("fr")
    assert "Bonjour" in (block.rich_text or "")


@pytest.mark.django_db
def test_question_read_surfaces_available_lang_codes(question, owner, en_lang, domain):
    """QuestionRead must expose the owner domain's allowed_languages."""
    domain.allowed_languages.add(en_lang)
    r = _auth(owner).get(f"/api/question/{question.id}/")
    assert r.status_code == 200, r.content
    codes = r.data["available_lang_codes"]
    assert "fr" in codes and "en" in codes
