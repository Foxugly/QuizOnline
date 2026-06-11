"""SECURITY: Course ``description`` / ``learning_objectives`` are rendered via
``[innerHTML]`` (bypassSecurityTrustHtml) on the SPA, so the backend must
nh3-sanitize them on write. Covers the three write paths: the write
serializer, ``import_course_from_dict`` and ``clone_course``.
"""

import pytest
from rest_framework.test import APIRequestFactory

from course.models import Course
from course.serializers import CourseWriteSerializer
from course.services import clone_course, import_course_from_dict

XSS = '<p>safe</p><script>alert(1)</script><img src=x onerror=alert(2)>'


def _has_no_xss(html: str) -> None:
    assert "<script" not in html.lower()
    assert "onerror" not in html.lower()


@pytest.mark.django_db
def test_write_serializer_sanitizes_description_and_objectives(domain, fr_lang):
    payload = {
        "domain": domain.id,
        "language_code": fr_lang.code,
        "translations": {
            "fr": {
                "title": "Cours",
                "description": XSS,
                "learning_objectives": XSS,
            }
        },
    }
    request = APIRequestFactory().post("/api/course/", payload, format="json")
    ser = CourseWriteSerializer(data=payload, context={"request": request})
    assert ser.is_valid(), ser.errors
    course = ser.save()
    course.set_current_language("fr")
    _has_no_xss(course.description)
    _has_no_xss(course.learning_objectives)
    # The benign markup survives.
    assert "<p>safe</p>" in course.description


@pytest.mark.django_db
def test_import_sanitizes_description(domain, fr_lang, owner):
    payload = {
        "version": "1.0",
        "course": {
            "slug": "imported",
            "level": Course.LEVEL_BEGINNER,
            "language_code": fr_lang.code,
            "estimated_duration": 0,
            "enrollment_mode": Course.ENROLL_OPEN,
            "translations": {
                "fr": {
                    "title": "Imported",
                    "description": XSS,
                    "learning_objectives": XSS,
                }
            },
            "sections": [],
        },
    }
    new = import_course_from_dict(payload=payload, target_domain=domain, by_user=owner)
    new.set_current_language("fr")
    _has_no_xss(new.description)
    _has_no_xss(new.learning_objectives)


@pytest.mark.django_db
def test_clone_sanitizes_description(course, owner):
    # Seed a course whose stored HTML predates the sanitize-on-write rule.
    course.set_current_language("fr")
    course.description = XSS
    course.learning_objectives = XSS
    course.save()

    new = clone_course(source=course, by_user=owner)
    new.set_current_language("fr")
    _has_no_xss(new.description)
    _has_no_xss(new.learning_objectives)
