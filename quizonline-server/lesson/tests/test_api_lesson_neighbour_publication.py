"""SECURITY: the prev/next neighbour navigation on ``LessonDetailSerializer``
must NOT surface an unpublished (draft) neighbour lesson to a learner. Only an
instructor of the course (domain owner / manager) sees draft neighbours — the
same predicate ``LessonQuerySet.visible_to`` uses to expose drafts.
"""

import pytest
from rest_framework.test import APIClient

from customuser.models import CustomUser
from course.models import Section
from lesson.models import Lesson


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def learner(db, domain):
    u = CustomUser.objects.create_user(
        email="learner@example.com", password="x"
    )
    domain.members.add(u)
    return u


@pytest.fixture
def published_course_with_draft_neighbour(db, course):
    # Course must be published for a learner to read its published lessons.
    course.is_published = True
    course.save(update_fields=["is_published"])
    section = Section.objects.create(course=course, order=0, is_published=True)

    def _make(order, slug, title, published):
        lesson = Lesson.objects.create(
            section=section, slug=slug, order=order, is_published=published
        )
        lesson.set_current_language("fr")
        lesson.title = title
        lesson.save()
        return lesson

    published = _make(0, "published", "Published lesson", True)
    draft = _make(1, "draft", "Draft neighbour", False)
    return {"published": published, "draft": draft}


@pytest.mark.django_db
def test_learner_does_not_see_unpublished_neighbour(
    learner, published_course_with_draft_neighbour
):
    published = published_course_with_draft_neighbour["published"]
    resp = _auth(learner).get(f"/api/lesson/{published.id}/")
    assert resp.status_code == 200
    body = resp.json()
    # The only neighbour is a draft — it must be hidden from the learner.
    assert body["next_lesson"] is None
    assert body["prev_lesson"] is None
    # The draft must not even count toward the position breadcrumb.
    assert body["position_in_section"] == {"current": 1, "total": 1}


@pytest.mark.django_db
def test_instructor_still_sees_unpublished_neighbour(
    owner, published_course_with_draft_neighbour
):
    published = published_course_with_draft_neighbour["published"]
    draft = published_course_with_draft_neighbour["draft"]
    resp = _auth(owner).get(f"/api/lesson/{published.id}/")
    assert resp.status_code == 200
    body = resp.json()
    # The course owner is an instructor — they see the draft neighbour.
    assert body["next_lesson"] == {"id": draft.id, "title": "Draft neighbour"}
    assert body["position_in_section"] == {"current": 1, "total": 2}
