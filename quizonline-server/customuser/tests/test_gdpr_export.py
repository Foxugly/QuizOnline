"""GDPR export (``GET /api/v1/user/me/export/``) covers the LMS data too.

Audit I6: the export used to stop at profile / domains / join requests /
quizzes and forgot enrollments, progress, certificates, reviews, notes and
login logs.
"""

import pytest
from rest_framework.test import APIClient

from certificate.models import Certificate
from connectionlog.models import ConnectionEvent
from course.models import Course, Section
from customuser.models import CustomUser
from domain.models import Domain, DomainJoinRequest
from enrollment.models import (
    CourseEnrollment,
    CourseProgress,
    LessonNote,
    LessonProgress,
)
from language.models import Language
from lesson.models import Lesson
from review.models import CourseReview


@pytest.mark.django_db
def test_export_includes_lms_and_login_data():
    fr = Language.objects.create(code="fr", name="French")
    owner = CustomUser.objects.create_user(email="owner-x@example.test", password="x")
    user = CustomUser.objects.create_user(email="learner-x@example.test", password="x")
    other = CustomUser.objects.create_user(email="other-x@example.test", password="x")
    domain = Domain.objects.create(owner=owner)
    domain.allowed_languages.add(fr)
    course = Course(domain=domain, slug="gdpr", language=fr, level=Course.LEVEL_BEGINNER)
    course.set_current_language("fr")
    course.title = "C"
    course.save()
    lesson = Lesson.objects.create(
        section=Section.objects.create(course=course, order=0), slug="l", order=0,
    )
    for who in (user, other):
        CourseEnrollment.objects.create(user=who, course=course)
        LessonProgress.objects.create(user=who, lesson=lesson, is_completed=True)
        CourseProgress.objects.create(user=who, course=course, progress_percent=100)
        LessonNote.objects.create(user=who, lesson=lesson, content=f"note {who.pk}")
        CourseReview.objects.create(user=who, course=course, rating=4, comment="ok")
        ConnectionEvent.objects.create(user=who, account_email=who.email, ip="10.0.0.1")
    Certificate.objects.create(
        user=user, course=course, certificate_number="QO-2026-9001",
        verification_token="tok-gdpr-export", holder_name="Learner X",
    )

    DomainJoinRequest.objects.create(domain=domain, user=user)

    client = APIClient()
    client.force_authenticate(user)
    resp = client.get("/api/v1/user/me/export/")
    # The export used to 500 (stale field names on join requests / quizzes).
    assert resp.status_code == 200
    body = resp.json()

    assert [e["course_id"] for e in body["enrollments"]] == [course.id]
    assert [p["lesson_id"] for p in body["lesson_progress"]] == [lesson.id]
    assert [p["course_id"] for p in body["course_progress"]] == [course.id]
    assert [c["certificate_number"] for c in body["certificates"]] == ["QO-2026-9001"]
    assert [r["rating"] for r in body["reviews"]] == [4]
    assert [n["content"] for n in body["lesson_notes"]] == [f"note {user.pk}"]
    assert [e["ip"] for e in body["login_events"]] == ["10.0.0.1"]
    assert [j["domain_id"] for j in body["join_requests"]] == [domain.id]
