import pytest
from django.contrib.auth.models import AnonymousUser

from course.permissions import is_lms_instructor, is_lms_learner


@pytest.mark.django_db
def test_is_lms_instructor_owner(course, owner):
    assert is_lms_instructor(owner, course) is True


@pytest.mark.django_db
def test_is_lms_instructor_anonymous(course):
    assert is_lms_instructor(AnonymousUser(), course) is False


@pytest.mark.django_db
def test_is_lms_instructor_random_user(course):
    from customuser.models import CustomUser
    u = CustomUser.objects.create_user(email="rnd@x.com", password="x")
    assert is_lms_instructor(u, course) is False


@pytest.mark.django_db
def test_is_lms_learner_member(course, domain):
    from customuser.models import CustomUser
    learner = CustomUser.objects.create_user(email="ln@x.com", password="x")
    domain.members.add(learner)
    assert is_lms_learner(learner, course) is True