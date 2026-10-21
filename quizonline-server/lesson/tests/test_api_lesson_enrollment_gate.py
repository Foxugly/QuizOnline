"""Enrollment gate on lesson content (audit 2026-10-18, M6).

``open`` courses stay free to read for whoever sees them. On an
``approval`` or ``invite`` course a learner must hold an active (or
completed) enrollment to read lesson content — detail, list, blocks and
lesson quizzes. Preview lessons, domain instructors and Django staff are
exempt. A learner who sees the lesson in the outline but may not read it
gets a 403 ``enrollment_required`` carrying the course slug.
"""

import pytest
from django.contrib.contenttypes.models import ContentType
from rest_framework.test import APIClient

from assessment.models import LessonQuiz
from block.models import Block
from course.models import Course, Section
from customuser.models import CustomUser
from enrollment.models import CourseEnrollment, CourseInvite
from lesson.models import Lesson


def _ids(response):
    payload = response.json()
    rows = payload["results"] if isinstance(payload, dict) else payload
    return {row["id"] for row in rows}


def _client(user=None):
    c = APIClient()
    if user is not None:
        c.force_authenticate(user)
    return c


@pytest.fixture
def chain(db, course):
    course.is_published = True
    course.save()
    section = Section.objects.create(course=course, order=5, is_published=True)
    lesson = Lesson.objects.create(section=section, slug="gated", order=0, is_published=True)
    preview = Lesson.objects.create(
        section=section, slug="teaser", order=1, is_published=True, is_preview=True,
    )
    block = Block.objects.create(
        target_content_type=ContentType.objects.get_for_model(Lesson),
        target_object_id=lesson.pk,
        block_type=Block.TYPE_CODE,
        code_language="python",
        code_content="print(1)",
    )
    return {"course": course, "lesson": lesson, "preview": preview, "block": block}


@pytest.fixture
def learner(db, domain):
    u = CustomUser.objects.create_user(email="learner@x.com", password="x")
    domain.members.add(u)
    return u


@pytest.fixture
def manager(db, domain):
    u = CustomUser.objects.create_user(email="manager@x.com", password="x")
    domain.managers.add(u)
    return u


@pytest.fixture
def staff(db):
    return CustomUser.objects.create_user(email="staff@x.com", password="x", is_staff=True)


def _set_mode(course, mode):
    course.enrollment_mode = mode
    course.save()


def _lesson_quiz(lesson, quiz_template):
    return LessonQuiz.objects.create(lesson=lesson, quiz_template=quiz_template)


# --- open course: unchanged ---------------------------------------------------


@pytest.mark.django_db
def test_open_course_lesson_readable_without_enrollment(chain, learner):
    lesson = chain["lesson"]
    client = _client(learner)
    assert client.get(f"/api/v1/lesson/{lesson.id}/").status_code == 200
    ids = _ids(client.get("/api/v1/lesson/"))
    assert lesson.id in ids
    assert client.get(f"/api/v1/block/{chain['block'].id}/").status_code == 200


@pytest.mark.django_db
def test_anonymous_still_gets_nothing(chain):
    lesson = chain["lesson"]
    assert _client().get(f"/api/v1/lesson/{lesson.id}/").status_code == 401


# --- approval / invite: enrollment required -----------------------------------


@pytest.mark.django_db
@pytest.mark.parametrize("mode", [Course.ENROLL_APPROVAL, Course.ENROLL_INVITE])
def test_gated_course_lesson_detail_403_enrollment_required(chain, learner, mode):
    course = chain["course"]
    _set_mode(course, mode)
    if mode == Course.ENROLL_INVITE:
        # Invite-only courses are visible to a member holding a pending
        # invite — they see the outline but cannot read the lessons yet.
        CourseInvite.objects.create(
            course=course, invitee=learner, created_by=course.domain.owner,
        )
    response = _client(learner).get(f"/api/v1/lesson/{chain['lesson'].id}/")
    assert response.status_code == 403
    body = response.json()
    assert body["code"] == "enrollment_required"
    assert body["course_slug"] == course.slug


@pytest.mark.django_db
def test_gated_course_hides_lessons_blocks_and_quizzes_from_lists(
    chain, learner, quiz_template,
):
    _set_mode(chain["course"], Course.ENROLL_APPROVAL)
    lq = _lesson_quiz(chain["lesson"], quiz_template)
    client = _client(learner)

    lesson_ids = _ids(client.get("/api/v1/lesson/"))
    assert chain["lesson"].id not in lesson_ids
    # The preview lesson stays the free teaser.
    assert chain["preview"].id in lesson_ids

    assert client.get(f"/api/v1/block/{chain['block'].id}/").status_code == 404
    block_ids = _ids(client.get("/api/v1/block/"))
    assert chain["block"].id not in block_ids

    assert client.get(f"/api/v1/validation-quiz/{lq.id}/").status_code == 404
    quiz_ids = _ids(client.get("/api/v1/validation-quiz/"))
    assert lq.id not in quiz_ids


@pytest.mark.django_db
def test_gated_course_final_quiz_hidden_without_enrollment(chain, learner, quiz_template):
    course = chain["course"]
    _set_mode(course, Course.ENROLL_APPROVAL)
    final = LessonQuiz.objects.create(course=course, quiz_template=quiz_template)
    ids = _ids(_client(learner).get("/api/v1/validation-quiz/"))
    assert final.id not in ids


@pytest.mark.django_db
def test_gated_course_preview_lesson_readable(chain, learner):
    _set_mode(chain["course"], Course.ENROLL_APPROVAL)
    response = _client(learner).get(f"/api/v1/lesson/{chain['preview'].id}/")
    assert response.status_code == 200


@pytest.mark.django_db
@pytest.mark.parametrize(
    "status_, allowed",
    [
        (CourseEnrollment.STATUS_ACTIVE, True),
        (CourseEnrollment.STATUS_COMPLETED, True),
        (CourseEnrollment.STATUS_PENDING, False),
        (CourseEnrollment.STATUS_CANCELLED, False),
    ],
)
def test_gated_course_enrollment_status(chain, learner, quiz_template, status_, allowed):
    course = chain["course"]
    _set_mode(course, Course.ENROLL_APPROVAL)
    CourseEnrollment.objects.create(user=learner, course=course, status=status_)
    lq = _lesson_quiz(chain["lesson"], quiz_template)
    client = _client(learner)

    detail = client.get(f"/api/v1/lesson/{chain['lesson'].id}/")
    assert detail.status_code == (200 if allowed else 403)
    lesson_ids = _ids(client.get("/api/v1/lesson/"))
    assert (chain["lesson"].id in lesson_ids) is allowed
    block = client.get(f"/api/v1/block/{chain['block'].id}/")
    assert block.status_code == (200 if allowed else 404)
    quiz_ids = _ids(client.get("/api/v1/validation-quiz/"))
    assert (lq.id in quiz_ids) is allowed


@pytest.mark.django_db
@pytest.mark.parametrize("who", ["owner", "manager", "staff"])
def test_gated_course_instructors_and_staff_read(chain, owner, manager, staff, who):
    _set_mode(chain["course"], Course.ENROLL_INVITE)
    user = {"owner": owner, "manager": manager, "staff": staff}[who]
    client = _client(user)
    assert client.get(f"/api/v1/lesson/{chain['lesson'].id}/").status_code == 200
    assert client.get(f"/api/v1/block/{chain['block'].id}/").status_code == 200
    lesson_ids = _ids(client.get("/api/v1/lesson/"))
    assert chain["lesson"].id in lesson_ids


@pytest.mark.django_db
def test_gated_course_outline_still_visible(chain, learner):
    """The course detail (outline: section / lesson titles) stays visible
    so the learner can find the enroll / request button."""
    course = chain["course"]
    _set_mode(course, Course.ENROLL_APPROVAL)
    response = _client(learner).get(f"/api/v1/course/{course.id}/")
    assert response.status_code == 200
