import pytest

from course.models import Section
from lesson.models import Lesson
from lms_enrollment.models import CourseEnrollment, CourseProgress
from lms_enrollment.services import (
    enroll_user_to_course,
    mark_lesson_completed,
    mark_lesson_started,
)


@pytest.fixture
def published_course_with_two_lessons(course):
    s = Section.objects.create(course=course, order=0, is_published=True)
    l1 = Lesson.objects.create(section=s, slug="l1", order=0, is_published=True)
    l2 = Lesson.objects.create(section=s, slug="l2", order=1, is_published=True)
    return course, l1, l2


@pytest.mark.django_db
def test_mark_started_creates_progress(published_course_with_two_lessons, learner):
    _, l1, _ = published_course_with_two_lessons
    p = mark_lesson_started(user=learner, lesson=l1)
    assert p.is_started is True


@pytest.mark.django_db
def test_mark_completed_updates_course_progress(published_course_with_two_lessons, learner):
    c, l1, l2 = published_course_with_two_lessons
    enroll_user_to_course(user=learner, course=c)
    mark_lesson_completed(user=learner, lesson=l1)
    cp = CourseProgress.objects.get(user=learner, course=c)
    assert cp.completed_lessons_count == 1
    assert cp.total_lessons_count == 2
    assert cp.progress_percent == 50


@pytest.mark.django_db
def test_complete_all_lessons_completes_enrollment(published_course_with_two_lessons, learner):
    c, l1, l2 = published_course_with_two_lessons
    enroll_user_to_course(user=learner, course=c)
    mark_lesson_completed(user=learner, lesson=l1)
    mark_lesson_completed(user=learner, lesson=l2)
    enr = CourseEnrollment.objects.get(user=learner, course=c)
    assert enr.status == CourseEnrollment.STATUS_COMPLETED


@pytest.mark.django_db
def test_mark_completed_is_idempotent(published_course_with_two_lessons, learner):
    c, l1, _ = published_course_with_two_lessons
    enroll_user_to_course(user=learner, course=c)
    mark_lesson_completed(user=learner, lesson=l1)
    mark_lesson_completed(user=learner, lesson=l1)
    cp = CourseProgress.objects.get(user=learner, course=c)
    assert cp.completed_lessons_count == 1
