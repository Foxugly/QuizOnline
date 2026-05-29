import pytest
from rest_framework.test import APIClient

from assessment.models import LessonQuiz
from customuser.models import CustomUser


@pytest.fixture
def lessonquiz(db, lesson, quiz_template):
    lq = LessonQuiz(lesson=lesson, quiz_template=quiz_template, required_score_percent=70)
    lq.save()
    return lq


@pytest.fixture
def outsider(db):
    """A user with no domain membership -- must not see the LessonQuiz."""
    return CustomUser.objects.create_user(
        username="outsider", email="outsider@x.com", password="x",
    )


@pytest.mark.django_db
def test_lessonquiz_list_rejects_anonymous(lessonquiz):
    """Without authentication, the list endpoint returns 401."""
    client = APIClient()
    response = client.get("/api/validation-quiz/")
    assert response.status_code == 401


@pytest.mark.django_db
def test_lessonquiz_list_hides_rows_from_outsider(lessonquiz, outsider):
    """A logged-in user with no domain membership must not see any
    LessonQuiz rows. Before the fix the queryset returned every binding
    in the database to any authenticated user.
    """
    client = APIClient()
    client.force_authenticate(user=outsider)
    response = client.get("/api/validation-quiz/")
    assert response.status_code == 200
    payload = response.json()
    results = payload["results"] if isinstance(payload, dict) and "results" in payload else payload
    assert results == [], (
        f"Outsider should see no LessonQuiz rows, got: {results!r}"
    )


@pytest.mark.django_db
def test_lessonquiz_list_shows_rows_to_owner(lessonquiz, owner):
    """The domain owner sees the LessonQuiz bindings for lessons they
    manage. Sanity check that the scoping does not break the legit
    instructor path.
    """
    client = APIClient()
    client.force_authenticate(user=owner)
    response = client.get("/api/validation-quiz/")
    assert response.status_code == 200
    payload = response.json()
    results = payload["results"] if isinstance(payload, dict) and "results" in payload else payload
    assert len(results) == 1
    assert results[0]["id"] == lessonquiz.id
