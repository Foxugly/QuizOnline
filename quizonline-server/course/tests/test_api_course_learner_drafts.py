"""Course detail never leaks drafts to learners, and "Resume" never points
at a draft lesson (which a learner would hit as a 404)."""

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from course.models import Section
from customuser.models import CustomUser
from enrollment.models import CourseEnrollment
from lesson.models import Lesson


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def mixed_course(course):
    """Published course: one published section holding a draft lesson then
    a published one, plus a draft section with a published lesson."""
    course.is_published = True
    course.published_at = timezone.now()
    course.save()
    live = Section.objects.create(course=course, order=0, is_published=True)
    draft_lesson = Lesson.objects.create(section=live, slug="draft-l", order=0)
    live_lesson = Lesson.objects.create(section=live, slug="live-l", order=1, is_published=True)
    hidden = Section.objects.create(course=course, order=1)
    Lesson.objects.create(section=hidden, slug="in-hidden", order=0, is_published=True)
    return course, live, draft_lesson, live_lesson, hidden


@pytest.fixture
def member(course):
    user = CustomUser.objects.create_user(email="member@example.test", password="x")
    course.domain.members.add(user)
    return user


@pytest.mark.django_db
def test_learner_sees_only_published_sections_and_lessons(mixed_course, member):
    course, live, _draft, live_lesson, _hidden = mixed_course
    body = _auth(member).get(f"/api/v1/course/{course.id}/").json()
    assert [s["id"] for s in body["sections"]] == [live.id]
    assert [lesson["id"] for lesson in body["sections"][0]["lessons"]] == [live_lesson.id]


@pytest.mark.django_db
def test_by_slug_hides_drafts_too(mixed_course, member):
    course, live, _draft, live_lesson, _hidden = mixed_course
    body = _auth(member).get(f"/api/v1/course/by-slug/{course.slug}/").json()
    assert [s["id"] for s in body["sections"]] == [live.id]
    assert [lesson["id"] for lesson in body["sections"][0]["lessons"]] == [live_lesson.id]


@pytest.mark.django_db
def test_instructor_sees_full_draft_tree(mixed_course, owner):
    course, live, draft_lesson, live_lesson, hidden = mixed_course
    body = _auth(owner).get(f"/api/v1/course/{course.id}/").json()
    assert [s["id"] for s in body["sections"]] == [live.id, hidden.id]
    assert [lesson["id"] for lesson in body["sections"][0]["lessons"]] == [
        draft_lesson.id, live_lesson.id,
    ]


@pytest.mark.django_db
def test_learner_sees_preview_draft_lesson(mixed_course, member):
    course, live, _draft, live_lesson, _hidden = mixed_course
    preview = Lesson.objects.create(section=live, slug="preview", order=2, is_preview=True)
    body = _auth(member).get(f"/api/v1/course/{course.id}/").json()
    ids = [lesson["id"] for lesson in body["sections"][0]["lessons"]]
    assert ids == [live_lesson.id, preview.id]


@pytest.mark.django_db
def test_resume_skips_draft_lessons_on_detail_and_list(mixed_course, member):
    course, _live, _draft, live_lesson, _hidden = mixed_course
    CourseEnrollment.objects.create(user=member, course=course)
    client = _auth(member)

    detail = client.get(f"/api/v1/course/{course.id}/").json()
    assert detail["my_enrollment"]["next_lesson_id"] == live_lesson.id

    listing = client.get("/api/v1/course/").json()
    row = next(c for c in listing["results"] if c["id"] == course.id)
    assert row["my_enrollment"]["next_lesson_id"] == live_lesson.id
