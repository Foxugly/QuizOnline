"""Tests for the ``my_enrollment`` / ``lesson_count`` /
``total_duration_minutes`` payload exposed by ``CourseListSerializer``.

Drives the catalog cards ("X lessons, Yh Zmin", enrolled badge,
progress bar) and the course-detail "Continue learning" CTA — both
need to know whether the caller is already enrolled and, if so,
which lesson to resume on.
"""

import pytest
from rest_framework.test import APIClient

from customuser.models import CustomUser
from course.models import Section
from lesson.models import Lesson
from enrollment.models import CourseEnrollment, CourseProgress, LessonProgress


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def published_course(db, course):
    """The shared ``course`` fixture is unpublished — publish it so the
    catalog visibility filter surfaces it to non-owner learners too."""
    from django.utils import timezone
    course.is_published = True
    course.published_at = timezone.now()
    course.save()
    return course


@pytest.fixture
def two_lessons(db, published_course):
    s = Section.objects.create(course=published_course, order=0, is_published=True)
    l1 = Lesson.objects.create(
        section=s, slug="l1", order=0, is_published=True, estimated_duration=15,
    )
    l2 = Lesson.objects.create(
        section=s, slug="l2", order=1, is_published=True, estimated_duration=20,
    )
    return [l1, l2]


@pytest.mark.django_db
def test_lesson_count_and_duration(owner, published_course, two_lessons):
    body = _auth(owner).get("/api/lms/course/").json()
    course = next(c for c in body["results"] if c["id"] == published_course.id)
    assert course["lesson_count"] == 2
    assert course["total_duration_minutes"] == 35


@pytest.mark.django_db
def test_my_enrollment_null_when_not_enrolled(published_course, two_lessons, db):
    other = CustomUser.objects.create_user(username="other", password="x")
    # Make ``other`` a domain member so the published course is visible
    # to them — the catalog visibility filter scopes "member" reads to
    # the domains they belong to.
    published_course.domain.members.add(other)
    body = _auth(other).get("/api/lms/course/").json()
    course = next(c for c in body["results"] if c["id"] == published_course.id)
    assert course["my_enrollment"] is None


@pytest.mark.django_db
def test_my_enrollment_returns_status_and_next_lesson(published_course, two_lessons, db):
    learner = CustomUser.objects.create_user(username="learner", password="x")
    published_course.domain.members.add(learner)
    CourseEnrollment.objects.create(
        user=learner, course=published_course, status=CourseEnrollment.STATUS_ACTIVE,
    )
    CourseProgress.objects.create(
        user=learner, course=published_course, progress_percent=30,
    )
    body = _auth(learner).get("/api/lms/course/").json()
    course = next(c for c in body["results"] if c["id"] == published_course.id)
    assert course["my_enrollment"]["status"] == "active"
    assert course["my_enrollment"]["progress_percent"] == 30
    # Nothing completed yet → next is the first lesson.
    assert course["my_enrollment"]["next_lesson_id"] == two_lessons[0].id


@pytest.mark.django_db
def test_my_enrollment_skips_completed_lessons(published_course, two_lessons, db):
    learner = CustomUser.objects.create_user(username="learner2", password="x")
    published_course.domain.members.add(learner)
    CourseEnrollment.objects.create(user=learner, course=published_course)
    LessonProgress.objects.create(user=learner, lesson=two_lessons[0], is_completed=True)
    body = _auth(learner).get("/api/lms/course/").json()
    course = next(c for c in body["results"] if c["id"] == published_course.id)
    assert course["my_enrollment"]["next_lesson_id"] == two_lessons[1].id


@pytest.mark.django_db
def test_my_enrollment_next_lesson_null_when_all_done(published_course, two_lessons, db):
    learner = CustomUser.objects.create_user(username="learner3", password="x")
    published_course.domain.members.add(learner)
    CourseEnrollment.objects.create(user=learner, course=published_course)
    for lesson in two_lessons:
        LessonProgress.objects.create(user=learner, lesson=lesson, is_completed=True)
    body = _auth(learner).get("/api/lms/course/").json()
    course = next(c for c in body["results"] if c["id"] == published_course.id)
    assert course["my_enrollment"]["next_lesson_id"] is None