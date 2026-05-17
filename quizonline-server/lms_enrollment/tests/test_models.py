import pytest
from django.db import IntegrityError

from lms_enrollment.models import CourseEnrollment, CourseProgress, LessonProgress


@pytest.mark.django_db
def test_enrollment_unique_per_user_course(course, learner):
    CourseEnrollment.objects.create(user=learner, course=course)
    with pytest.raises(IntegrityError):
        CourseEnrollment.objects.create(user=learner, course=course)


@pytest.mark.django_db
def test_lesson_progress_unique_per_user_lesson(lesson, learner):
    LessonProgress.objects.create(user=learner, lesson=lesson)
    with pytest.raises(IntegrityError):
        LessonProgress.objects.create(user=learner, lesson=lesson)


@pytest.mark.django_db
def test_course_progress_unique_per_user_course(course, learner):
    CourseProgress.objects.create(user=learner, course=course)
    with pytest.raises(IntegrityError):
        CourseProgress.objects.create(user=learner, course=course)
