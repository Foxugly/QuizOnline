"""Self-enrollment is only possible on a published course the caller can
see (same rule as the course list); anything else answers 404 so the
route is not a course-existence oracle."""

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from course.models import Course
from customuser.models import CustomUser
from domain.models import Domain
from enrollment.models import CourseEnrollment


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def _publish(course):
    course.is_published = True
    course.published_at = timezone.now()
    course.save()


@pytest.fixture
def foreign_course(db, fr_lang):
    other_owner = CustomUser.objects.create_user(email="other@x.com", password="x")
    d = Domain.objects.create(owner=other_owner)
    d.set_current_language("fr")
    d.name = "Other"
    d.save()
    d.allowed_languages.add(fr_lang)
    c = Course(domain=d, slug="foreign", language=fr_lang, level=Course.LEVEL_BEGINNER)
    c.set_current_language("fr")
    c.title = "Foreign"
    c.save()
    return c


@pytest.mark.django_db
def test_member_cannot_enroll_in_unpublished_course(course, learner):
    r = _auth(learner).post(f"/api/v1/course/{course.id}/enroll/")
    assert r.status_code == 404
    assert not CourseEnrollment.objects.filter(user=learner).exists()


@pytest.mark.django_db
def test_cannot_enroll_in_other_domain_course(foreign_course, learner):
    _publish(foreign_course)
    r = _auth(learner).post(f"/api/v1/course/{foreign_course.id}/enroll/")
    assert r.status_code == 404
    assert not CourseEnrollment.objects.filter(user=learner).exists()


@pytest.mark.django_db
def test_cannot_enroll_in_unpublished_other_domain_course(foreign_course, learner):
    r = _auth(learner).post(f"/api/v1/course/{foreign_course.id}/enroll/")
    assert r.status_code == 404


@pytest.mark.django_db
def test_instructor_cannot_enroll_in_own_draft(course, owner):
    r = _auth(owner).post(f"/api/v1/course/{course.id}/enroll/")
    assert r.status_code == 404


@pytest.mark.django_db
def test_member_can_enroll_in_published_course(course, learner):
    _publish(course)
    r = _auth(learner).post(f"/api/v1/course/{course.id}/enroll/")
    assert r.status_code == 201, r.data
    assert r.data["status"] == "active"

