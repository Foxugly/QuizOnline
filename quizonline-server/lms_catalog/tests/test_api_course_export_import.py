"""Tests for the course export/import endpoints.

GET  /api/lms/course/{id}/export/  → dump the course as a JSON dict.
POST /api/lms/course/import/       → recreate the course in a target
                                     domain. The new course is
                                     created unpublished and the
                                     slug is uniquified on collision.
"""

import pytest
from rest_framework.test import APIClient

from customuser.models import CustomUser
from lms_catalog.models import Course, ContentBlock, Lesson, Section
from lms_catalog.services import export_course_to_dict


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def populated_course(db, course):
    """Course with one section + one lesson + one rich_text block, all
    translated in ``fr`` so the export round-trip carries content."""
    s = Section.objects.create(course=course, order=0, is_published=True)
    s.set_current_language("fr")
    s.title = "Section A"
    s.save()
    lesson = Lesson.objects.create(section=s, slug="l1", order=0, is_published=True, estimated_duration=15)
    lesson.set_current_language("fr")
    lesson.title = "Lesson 1"
    lesson.save()
    block = ContentBlock.objects.create(
        lesson=lesson, block_type=ContentBlock.TYPE_RICH_TEXT, order=0,
    )
    block.set_current_language("fr")
    block.rich_text = "<p>hello</p>"
    block.save()
    return course


@pytest.mark.django_db
def test_export_returns_full_payload(owner, populated_course):
    payload = export_course_to_dict(course=populated_course)
    assert payload["version"] == "1.0"
    course = payload["course"]
    assert course["slug"] == populated_course.slug
    assert course["language_code"] == "fr"
    assert len(course["sections"]) == 1
    section = course["sections"][0]
    assert section["translations"]["fr"]["title"] == "Section A"
    assert len(section["lessons"]) == 1
    lesson = section["lessons"][0]
    assert lesson["estimated_duration"] == 15
    assert lesson["translations"]["fr"]["title"] == "Lesson 1"
    assert len(lesson["blocks"]) == 1
    block = lesson["blocks"][0]
    assert block["block_type"] == "rich_text"
    assert block["translations"]["fr"]["rich_text"] == "<p>hello</p>"


@pytest.mark.django_db
def test_export_endpoint_instructor_gated(populated_course, db):
    stranger = CustomUser.objects.create_user(username="stranger", password="x")
    resp = _auth(stranger).get(f"/api/lms/course/{populated_course.id}/export/")
    # 403 (instructor check) or 404 (visibility filter) is acceptable.
    assert resp.status_code in (403, 404)


@pytest.mark.django_db
def test_import_roundtrips_structure(owner, populated_course, domain):
    payload = export_course_to_dict(course=populated_course)
    resp = _auth(owner).post(
        "/api/lms/course/import/",
        {"payload": payload, "target_domain_id": domain.id},
        format="json",
    )
    assert resp.status_code == 201, resp.content
    body = resp.json()
    # Slug is uniquified on collision.
    assert body["slug"] != populated_course.slug
    new = Course.objects.get(pk=body["id"])
    # Created unpublished — the importer never auto-publishes.
    assert new.is_published is False
    assert new.sections.count() == 1
    section = new.sections.first()
    assert section.is_published is True
    assert section.lessons.count() == 1
    lesson = section.lessons.first()
    assert lesson.estimated_duration == 15
    assert lesson.blocks.count() == 1


@pytest.mark.django_db
def test_import_rejects_wrong_version(owner, domain):
    resp = _auth(owner).post(
        "/api/lms/course/import/",
        {"payload": {"version": "9.9", "course": {}}, "target_domain_id": domain.id},
        format="json",
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_import_rejects_unknown_domain(owner):
    resp = _auth(owner).post(
        "/api/lms/course/import/",
        {"payload": {"version": "1.0", "course": {}}, "target_domain_id": 99999},
        format="json",
    )
    assert resp.status_code == 400
