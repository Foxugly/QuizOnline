"""Cross-tenant write matrix: an instructor of domain A must never be able
to create content under, or move their own content into, a course /
section / lesson / domain belonging to domain B.

Every write is checked against the *target* parent (the one the object
will belong to after the write), not only against the payload's
``domain`` hint or the object's current parent.
"""

import pytest
from rest_framework.test import APIClient

from block.models import Block
from course.models import Course, Section
from customuser.models import CustomUser
from domain.models import Domain
from lesson.models import Lesson
from quiz.models import QuizTemplate


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def _domain(owner, lang, name):
    d = Domain.objects.create(owner=owner)
    d.set_current_language("fr")
    d.name = name
    d.save()
    d.allowed_languages.add(lang)
    return d


def _course(domain, lang, slug):
    c = Course(domain=domain, slug=slug, language=lang, level=Course.LEVEL_BEGINNER)
    c.set_current_language("fr")
    c.title = slug
    c.save()
    return c


class _Tenant:
    def __init__(self, owner, lang, tag):
        self.owner = owner
        self.domain = _domain(owner, lang, f"Domain {tag}")
        self.course = _course(self.domain, lang, f"course-{tag}")
        # Distinct positions per tenant so a cross-tenant move can never
        # be rejected by a mere (parent, order) collision.
        order = 0 if tag == "a" else 5
        self.section = Section.objects.create(course=self.course, order=order)
        self.lesson = Lesson.objects.create(section=self.section, slug=f"l-{tag}", order=order)
        self.block = Block.objects.create(
            target=self.lesson, block_type=Block.TYPE_CODE, order=order, code_content="x",
        )
        self.quiz_template = QuizTemplate.objects.create(
            domain=self.domain, title=f"QT {tag}", created_by=owner,
        )


@pytest.fixture
def tenants(db, fr_lang):
    a = _Tenant(CustomUser.objects.create_user(email="a@x.com", password="x"), fr_lang, "a")
    b = _Tenant(CustomUser.objects.create_user(email="b@x.com", password="x"), fr_lang, "b")
    return a, b


# -- create under another tenant's parent ------------------------------------


@pytest.mark.django_db
@pytest.mark.parametrize("with_domain_hint", [False, True])
def test_cannot_create_section_in_foreign_course(tenants, with_domain_hint):
    a, b = tenants
    payload = {"course": b.course.id, "translations": {"fr": {"title": "x"}}}
    if with_domain_hint:
        payload["domain"] = a.domain.id
    r = _auth(a.owner).post("/api/v1/section/", payload, format="json")
    assert r.status_code == 403
    assert not b.course.sections.exclude(pk=b.section.pk).exists()


@pytest.mark.django_db
@pytest.mark.parametrize("with_domain_hint", [False, True])
def test_cannot_create_lesson_in_foreign_section(tenants, with_domain_hint):
    a, b = tenants
    payload = {"section": b.section.id, "translations": {"fr": {"title": "x"}}}
    if with_domain_hint:
        payload["domain"] = a.domain.id
    r = _auth(a.owner).post("/api/v1/lesson/", payload, format="json")
    assert r.status_code == 403
    assert b.section.lessons.count() == 1


@pytest.mark.django_db
@pytest.mark.parametrize("with_domain_hint", [False, True])
def test_cannot_create_block_in_foreign_lesson(tenants, with_domain_hint):
    a, b = tenants
    payload = {"lesson": b.lesson.id, "block_type": "rich_text", "block_role": "body"}
    if with_domain_hint:
        payload["domain"] = a.domain.id
    r = _auth(a.owner).post("/api/v1/block/", payload, format="json")
    assert r.status_code == 403
    assert b.lesson.blocks.count() == 1


@pytest.mark.django_db
def test_cannot_create_block_mixing_own_and_foreign_parent_keys(tenants):
    a, b = tenants
    r = _auth(a.owner).post("/api/v1/block/", {
        "lesson": b.lesson.id, "section": a.section.id,
        "block_type": "rich_text", "block_role": "body",
    }, format="json")
    assert r.status_code == 403


@pytest.mark.django_db
@pytest.mark.parametrize("with_domain_hint", [False, True])
def test_cannot_create_validation_quiz_on_foreign_lesson(tenants, with_domain_hint):
    a, b = tenants
    payload = {
        "lesson": b.lesson.id, "quiz_template": a.quiz_template.id,
        "required_score_percent": 50,
    }
    if with_domain_hint:
        payload["domain"] = a.domain.id
    r = _auth(a.owner).post("/api/v1/validation-quiz/", payload, format="json")
    assert r.status_code == 403


@pytest.mark.django_db
def test_cannot_create_quiz_block_with_foreign_quiz_template(tenants):
    a, b = tenants
    r = _auth(a.owner).post("/api/v1/block/", {
        "lesson": a.lesson.id, "block_type": "quiz", "block_role": "body",
        "quiz_template": b.quiz_template.id, "translations": {},
    }, format="json")
    assert r.status_code == 400
    assert "quiz_template" in r.data


@pytest.mark.django_db
def test_own_creates_still_work(tenants):
    a, _ = tenants
    client = _auth(a.owner)
    r = client.post("/api/v1/section/", {
        "course": a.course.id, "domain": a.domain.id, "translations": {"fr": {"title": "s"}},
    }, format="json")
    assert r.status_code == 201, r.data
    r = client.post("/api/v1/lesson/", {
        "section": a.section.id, "translations": {"fr": {"title": "l"}},
    }, format="json")
    assert r.status_code == 201, r.data
    r = client.post("/api/v1/block/", {
        "lesson": a.lesson.id, "block_type": "quiz", "block_role": "body",
        "quiz_template": a.quiz_template.id, "translations": {},
    }, format="json")
    assert r.status_code == 201, r.data
    r = client.post("/api/v1/validation-quiz/", {
        "lesson": a.lesson.id, "quiz_template": a.quiz_template.id,
        "required_score_percent": 50,
    }, format="json")
    assert r.status_code == 201, r.data


# -- move own objects into another tenant via a parent FK --------------------


@pytest.mark.django_db
def test_cannot_move_section_to_foreign_course(tenants):
    a, b = tenants
    r = _auth(a.owner).patch(f"/api/v1/section/{a.section.id}/", {"course": b.course.id}, format="json")
    assert r.status_code == 400
    assert "course" in r.data
    a.section.refresh_from_db()
    assert a.section.course_id == a.course.id


@pytest.mark.django_db
def test_cannot_move_lesson_to_foreign_section(tenants):
    a, b = tenants
    r = _auth(a.owner).patch(f"/api/v1/lesson/{a.lesson.id}/", {"section": b.section.id}, format="json")
    assert r.status_code == 400
    assert "section" in r.data
    a.lesson.refresh_from_db()
    assert a.lesson.section_id == a.section.id


@pytest.mark.django_db
def test_cannot_move_block_to_foreign_lesson(tenants):
    a, b = tenants
    r = _auth(a.owner).patch(f"/api/v1/block/{a.block.id}/", {"lesson": b.lesson.id}, format="json")
    assert r.status_code == 400
    assert "lesson" in r.data
    a.block.refresh_from_db()
    assert a.block.target == a.lesson


@pytest.mark.django_db
def test_cannot_move_course_to_foreign_domain(tenants):
    a, b = tenants
    r = _auth(a.owner).patch(f"/api/v1/course/{a.course.id}/", {"domain": b.domain.id}, format="json")
    assert r.status_code == 400
    assert "domain" in r.data
    a.course.refresh_from_db()
    assert a.course.domain_id == a.domain.id


@pytest.mark.django_db
def test_cannot_move_validation_quiz_to_foreign_lesson(tenants):
    from assessment.models import LessonQuiz
    a, b = tenants
    lq = LessonQuiz.objects.create(lesson=a.lesson, quiz_template=a.quiz_template)
    r = _auth(a.owner).patch(f"/api/v1/validation-quiz/{lq.id}/", {"lesson": b.lesson.id}, format="json")
    assert r.status_code == 400
    assert "lesson" in r.data
    lq.refresh_from_db()
    assert lq.lesson_id == a.lesson.id


@pytest.mark.django_db
def test_parent_unchanged_in_patch_is_accepted(tenants):
    """The block editor PATCHes its full snapshot (incl. ``lesson``):
    resending the current parent must keep working."""
    a, _ = tenants
    client = _auth(a.owner)
    r = client.patch(f"/api/v1/block/{a.block.id}/", {
        "lesson": a.lesson.id, "question": None, "answer_option": None, "code_content": "y",
    }, format="json")
    assert r.status_code == 200, r.data
    r = client.patch(f"/api/v1/lesson/{a.lesson.id}/", {"section": a.section.id, "is_preview": True}, format="json")
    assert r.status_code == 200, r.data
    r = client.patch(f"/api/v1/section/{a.section.id}/", {"course": a.course.id}, format="json")
    assert r.status_code == 200, r.data
    r = client.patch(f"/api/v1/course/{a.course.id}/", {"domain": a.domain.id}, format="json")
    assert r.status_code == 200, r.data


@pytest.mark.django_db
def test_move_within_same_course_still_works(tenants):
    a, _ = tenants
    other = Section.objects.create(course=a.course, order=1)
    r = _auth(a.owner).post(
        f"/api/v1/lesson/{a.lesson.id}/move/", {"section": other.id, "position": 0}, format="json",
    )
    assert r.status_code == 200, r.data
    a.lesson.refresh_from_db()
    assert a.lesson.section_id == other.id
