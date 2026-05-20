import pytest
from rest_framework.test import APIClient


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.mark.django_db
def test_non_member_cannot_list_course(course):
    from customuser.models import CustomUser
    intruder = CustomUser.objects.create_user(username="intr", email="intr@x.com", password="x")
    r = _auth(intruder).get("/api/course/")
    assert r.status_code == 200
    assert r.data["count"] == 0


@pytest.mark.django_db
def test_member_sees_published_course_only(course, domain):
    from customuser.models import CustomUser
    learner = CustomUser.objects.create_user(username="lr", email="lr@x.com", password="x")
    domain.members.add(learner)
    r = _auth(learner).get("/api/course/")
    assert r.status_code == 200
    assert r.data["count"] == 0  # course unpublished
    from django.utils import timezone
    course.is_published = True
    course.published_at = timezone.now()
    course.save()
    r = _auth(learner).get("/api/course/")
    assert r.data["count"] == 1


@pytest.mark.django_db
def test_member_cannot_create_course(domain, fr_lang):
    from customuser.models import CustomUser
    learner = CustomUser.objects.create_user(username="lr", email="lr@x.com", password="x")
    domain.members.add(learner)
    r = _auth(learner).post("/api/course/", {
        "slug": "x", "level": "beginner",
        "language_code": "fr", "domain": domain.id,
        "translations": {"fr": {"title": "X"}},
    }, format="json")
    assert r.status_code in (400, 403)


@pytest.mark.django_db
def test_owner_can_create_course(domain, fr_lang, owner):
    r = _auth(owner).post("/api/course/", {
        "slug": "owned", "level": "beginner",
        "language_code": "fr", "domain": domain.id,
        "translations": {"fr": {"title": "X"}},
    }, format="json")
    assert r.status_code == 201


@pytest.mark.django_db
def test_owner_can_publish_course(course, owner):
    from course.models import Section
    from lesson.models import Lesson
    s = Section.objects.create(course=course, order=0, is_published=True)
    Lesson.objects.create(section=s, slug="l", order=0, is_published=True)
    r = _auth(owner).post(f"/api/course/{course.id}/publish/")
    assert r.status_code == 200


@pytest.mark.django_db
def test_learner_cannot_publish_course(course, domain):
    from customuser.models import CustomUser
    learner = CustomUser.objects.create_user(username="lr", email="lr@x.com", password="x")
    domain.members.add(learner)
    r = _auth(learner).post(f"/api/course/{course.id}/publish/")
    assert r.status_code in (403, 404)


@pytest.mark.django_db
def test_verify_anonymous_works(course):
    from customuser.models import CustomUser
    user = CustomUser.objects.create_user(username="u", email="u@x.com", password="x")
    from certificate.models import Certificate
    Certificate.objects.create(
        user=user, course=course, certificate_number="QO-T-1", verification_token="abc",
    )
    r = APIClient().get("/api/verify/abc/")
    assert r.status_code == 200
    assert r.data["valid"] is True


@pytest.mark.django_db
def test_verify_invalid_token_404():
    r = APIClient().get("/api/verify/nope/")
    assert r.status_code == 404