"""Progress may only be recorded by an enrolled learner on a live lesson.

Before this gate, ``lesson/{id}/start|progress|complete/`` looked the lesson
up with a bare ``Lesson.objects.filter(pk=...)``: any authenticated user
could complete any lesson of any domain — pending, cancelled or never
enrolled — and walk away with the course certificate.
"""

from __future__ import annotations

import types

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from course.models import Section
from customuser.models import CustomUser
from enrollment.models import CourseEnrollment, CourseProgress, LessonProgress
from lesson.models import Lesson


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def _url(name, lesson):
    return reverse(f"api:enrollment-api:{name}", kwargs={"lesson_id": lesson.id})


@pytest.fixture
def live_lesson(course):
    course.is_published = True
    course.published_at = timezone.now()
    course.save()
    section = Section.objects.create(course=course, order=0, is_published=True)
    return Lesson.objects.create(section=section, slug="live", order=0, is_published=True)


def _enroll(user, course, status=CourseEnrollment.STATUS_ACTIVE):
    return CourseEnrollment.objects.create(user=user, course=course, status=status)


@pytest.mark.django_db
def test_active_enrollment_can_complete(live_lesson, learner):
    _enroll(learner, live_lesson.section.course)
    resp = _auth(learner).post(_url("complete-lesson", live_lesson), {}, format="json")
    assert resp.status_code == 200
    assert LessonProgress.objects.get(user=learner, lesson=live_lesson).is_completed


@pytest.mark.django_db
@pytest.mark.parametrize("name", ["start-lesson", "record-lesson-progress", "complete-lesson"])
def test_member_without_enrollment_is_refused(live_lesson, learner, name):
    resp = _auth(learner).post(_url(name, live_lesson), {"progress_percent": 50}, format="json")
    assert resp.status_code == 403
    assert not LessonProgress.objects.filter(user=learner).exists()


@pytest.mark.django_db
@pytest.mark.parametrize(
    "status", [CourseEnrollment.STATUS_PENDING, CourseEnrollment.STATUS_CANCELLED],
)
def test_pending_or_cancelled_enrollment_is_refused(live_lesson, learner, status):
    _enroll(learner, live_lesson.section.course, status=status)
    resp = _auth(learner).post(_url("complete-lesson", live_lesson), {}, format="json")
    assert resp.status_code == 403
    assert not LessonProgress.objects.filter(user=learner).exists()
    assert not CourseProgress.objects.filter(user=learner).exists()


@pytest.mark.django_db
def test_completed_enrollment_can_still_record(live_lesson, learner):
    _enroll(learner, live_lesson.section.course, status=CourseEnrollment.STATUS_COMPLETED)
    resp = _auth(learner).post(_url("start-lesson", live_lesson), {}, format="json")
    assert resp.status_code == 200


@pytest.mark.django_db
def test_draft_lesson_is_invisible_to_enrolled_learner(live_lesson, learner):
    _enroll(learner, live_lesson.section.course)
    draft = Lesson.objects.create(section=live_lesson.section, slug="draft", order=1)
    resp = _auth(learner).post(_url("complete-lesson", draft), {}, format="json")
    assert resp.status_code == 404


@pytest.mark.django_db
def test_preview_draft_lesson_records_nothing(live_lesson, learner):
    # Readable (preview) but not published: it does not count toward
    # progress, so recording on it is refused.
    _enroll(learner, live_lesson.section.course)
    preview = Lesson.objects.create(
        section=live_lesson.section, slug="preview", order=1, is_preview=True,
    )
    resp = _auth(learner).post(_url("complete-lesson", preview), {}, format="json")
    assert resp.status_code == 403


@pytest.mark.django_db
def test_lesson_in_draft_section_is_refused(live_lesson, learner):
    _enroll(learner, live_lesson.section.course)
    draft_section = Section.objects.create(course=live_lesson.section.course, order=1)
    lesson = Lesson.objects.create(section=draft_section, slug="in-draft", order=0, is_published=True)
    resp = _auth(learner).post(_url("complete-lesson", lesson), {}, format="json")
    # Hidden from learners (Lesson.visible_to needs a published section).
    assert resp.status_code == 404


@pytest.mark.django_db
def test_outsider_gets_404_not_403(live_lesson):
    # Not a member of the course's domain: no existence oracle.
    outsider = CustomUser.objects.create_user(email="outsider@x.com", password="x")
    resp = _auth(outsider).post(_url("complete-lesson", live_lesson), {}, format="json")
    assert resp.status_code == 404


@pytest.mark.django_db
def test_complete_rejects_non_integer_percent(live_lesson, learner):
    _enroll(learner, live_lesson.section.course)
    resp = _auth(learner).post(
        _url("complete-lesson", live_lesson), {"progress_percent": "abc"}, format="json",
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_no_certificate_without_enrollment(live_lesson, learner):
    from certificate.models import Certificate
    from certificate.services import issue_certificate_if_eligible

    course = live_lesson.section.course
    # A stray 100 % progress row (e.g. left over from before the gate).
    CourseProgress.objects.create(
        user=learner, course=course, total_lessons_count=1,
        completed_lessons_count=1, progress_percent=100,
    )
    assert issue_certificate_if_eligible(user=learner, course=course) is None
    assert not Certificate.objects.filter(user=learner).exists()


@pytest.mark.django_db
def test_lesson_quiz_pass_only_completes_enrolled_courses(
    live_lesson, learner, quiz_template, monkeypatch,
):
    from assessment import services as assessment_services
    from assessment.models import LessonQuiz

    LessonQuiz.objects.create(lesson=live_lesson, quiz_template=quiz_template)
    monkeypatch.setattr(assessment_services, "compute_score_percent", lambda _s: 100)
    session = types.SimpleNamespace(quiz_template=quiz_template, user=learner)

    assessment_services.evaluate_lesson_quiz_attempt(quiz_session=session)
    assert not LessonProgress.objects.filter(user=learner).exists()

    _enroll(learner, live_lesson.section.course)
    assessment_services.evaluate_lesson_quiz_attempt(quiz_session=session)
    assert LessonProgress.objects.get(user=learner, lesson=live_lesson).is_completed
