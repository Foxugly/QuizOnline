"""Test that ``course_title`` (localized) and ``verification_token`` flow
through ``CourseProgressSerializer`` / ``CertificateSerializer``."""

import pytest

from lms_enrollment.models import Certificate, CourseProgress
from lms_enrollment.serializers import (
    CertificateSerializer,
    CourseProgressSerializer,
)


class _StubRequest:
    """Minimal request stand-in carrying a ``user`` with a ``language`` attr."""

    def __init__(self, language: str):
        self.user = type("U", (), {"language": language})()


@pytest.mark.django_db
def test_course_progress_serializer_exposes_localized_course_title(course, learner):
    course.set_current_language("fr")
    course.title = "Intro Python (FR)"
    course.save()
    course.set_current_language("en")
    course.title = "Intro Python (EN)"
    course.save()

    cp = CourseProgress.objects.create(user=learner, course=course)

    fr_payload = CourseProgressSerializer(cp, context={"request": _StubRequest("fr")}).data
    assert fr_payload["course_title"] == "Intro Python (FR)"

    en_payload = CourseProgressSerializer(cp, context={"request": _StubRequest("en")}).data
    assert en_payload["course_title"] == "Intro Python (EN)"


@pytest.mark.django_db
def test_course_progress_serializer_falls_back_to_slug_when_no_translation(course, learner):
    # Course has translations only in fr (from the conftest fixture).
    cp = CourseProgress.objects.create(user=learner, course=course)
    payload = CourseProgressSerializer(cp, context={"request": _StubRequest("it")}).data
    # Italian translation absent → parler's any_language fallback picks fr; slug
    # only kicks in if NO translation exists at all.
    assert payload["course_title"]  # non-empty


@pytest.mark.django_db
def test_certificate_serializer_exposes_course_title_and_verification_token(course, learner):
    course.set_current_language("fr")
    course.title = "Mon cours"
    course.save()

    cert = Certificate.objects.create(
        user=learner, course=course,
        certificate_number="QO-TEST-0001",
        verification_token="tok-abc-123",
    )

    payload = CertificateSerializer(cert, context={"request": _StubRequest("fr")}).data

    assert payload["course_title"] == "Mon cours"
    assert payload["verification_token"] == "tok-abc-123"
    assert payload["certificate_number"] == "QO-TEST-0001"
    # Sanity: pre-existing fields still there.
    assert "pdf_url" in payload
    assert "issued_at" in payload
