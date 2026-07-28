import pytest
from django.utils import translation
from rest_framework.test import APIClient

from customuser.models import CustomUser
from domain.models import Domain
from course.models import Course
from language.models import Language
from enrollment.models import CourseProgress
from review.models import CourseReview
from review.services import (
    ReviewNotAllowed,
    course_review_summary,
    upsert_review,
)


@pytest.fixture(autouse=True)
def _lang():
    translation.activate("fr")


@pytest.fixture
def fr_lang(db):
    return Language.objects.create(code="fr", name="French")


@pytest.fixture
def owner(db):
    return CustomUser.objects.create_user(email="owner-r@ex.com", password="x")


@pytest.fixture
def domain(db, owner, fr_lang):
    d = Domain.objects.create(owner=owner, active=True)
    d.set_current_language("fr")
    d.name = "D"
    d.save()
    d.allowed_languages.add(fr_lang)
    return d


@pytest.fixture
def course(db, domain, fr_lang):
    c = Course(domain=domain, slug="c-rev", language=fr_lang, level=Course.LEVEL_BEGINNER)
    c.set_current_language("fr")
    c.title = "C"
    c.save()
    return c


@pytest.fixture
def learner(db, domain):
    u = CustomUser.objects.create_user(email="learner-r@ex.com", password="x")
    domain.members.add(u)
    return u


def _complete(user, course):
    CourseProgress.objects.update_or_create(
        user=user, course=course, defaults={"progress_percent": 100},
    )


@pytest.mark.django_db
def test_cannot_review_without_completion(course, learner):
    with pytest.raises(ReviewNotAllowed):
        upsert_review(user=learner, course=course, rating=5, comment="Great")


@pytest.mark.django_db
def test_upsert_creates_then_updates_single_row(course, learner):
    _complete(learner, course)
    r1 = upsert_review(user=learner, course=course, rating=4, comment="Good")
    assert r1.rating == 4
    r2 = upsert_review(user=learner, course=course, rating=5, comment="Even better")
    assert r2.pk == r1.pk  # one review per (user, course)
    assert CourseReview.objects.filter(course=course, user=learner).count() == 1
    assert r2.rating == 5


@pytest.mark.django_db
def test_domain_config_strips_disallowed_fields(course, learner, domain):
    _complete(learner, course)
    domain.reviews_allow_comment = False
    domain.save(update_fields=["reviews_allow_comment"])
    r = upsert_review(user=learner, course=course, rating=5, comment="hidden by config")
    assert r.rating == 5
    assert r.comment == ""  # comments disabled for this domain

    domain.reviews_allow_comment = True
    domain.reviews_allow_rating = False
    domain.save(update_fields=["reviews_allow_comment", "reviews_allow_rating"])
    r = upsert_review(user=learner, course=course, rating=3, comment="kept")
    assert r.rating is None  # ratings disabled
    assert r.comment == "kept"


@pytest.mark.django_db
def test_summary_counts_visible_ratings_only(course, learner, domain):
    _complete(learner, course)
    upsert_review(user=learner, course=course, rating=4, comment="")
    other = CustomUser.objects.create_user(email="l2-r@ex.com", password="x")
    domain.members.add(other)
    _complete(other, course)
    hidden = upsert_review(user=other, course=course, rating=2, comment="")
    hidden.hidden_at = hidden.updated_at  # hide it
    hidden.save(update_fields=["hidden_at"])

    summary = course_review_summary(course)
    assert summary["average_rating"] == 4.0  # hidden one excluded
    assert summary["rating_count"] == 1
    assert summary["review_count"] == 1


@pytest.mark.django_db
def test_endpoint_put_list_and_moderation(course, learner, owner):
    _complete(learner, course)
    url = f"/api/v1/course/{course.id}/reviews/"

    learner_client = APIClient()
    learner_client.force_authenticate(learner)
    put = learner_client.put(url, {"rating": 5, "comment": "Nice"}, format="json")
    assert put.status_code == 200

    listing = learner_client.get(url)
    assert listing.status_code == 200
    assert listing.data["can_review"] is True
    assert listing.data["my_review"]["rating"] == 5
    assert len(listing.data["reviews"]) == 1
    review_id = listing.data["reviews"][0]["id"]

    # Owner (manager) hides it.
    owner_client = APIClient()
    owner_client.force_authenticate(owner)
    hide = owner_client.post(f"/api/v1/review/{review_id}/moderate/", {"hidden": True}, format="json")
    assert hide.status_code == 200

    # A stranger no longer sees the hidden review.
    stranger = CustomUser.objects.create_user(email="stranger-r@ex.com", password="x")
    sc = APIClient()
    sc.force_authenticate(stranger)
    assert len(sc.get(url).data["reviews"]) == 0


@pytest.mark.django_db
def test_stranger_cannot_moderate(course, learner):
    _complete(learner, course)
    review = upsert_review(user=learner, course=course, rating=5, comment="")
    stranger = CustomUser.objects.create_user(email="nope-r@ex.com", password="x")
    c = APIClient()
    c.force_authenticate(stranger)
    resp = c.post(f"/api/v1/review/{review.id}/moderate/", {"hidden": True}, format="json")
    assert resp.status_code == 403
