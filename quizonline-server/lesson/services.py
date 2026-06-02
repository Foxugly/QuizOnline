from __future__ import annotations

from django.db import models, transaction

from core.services import compact, two_phase_reorder

from .models import Lesson


@transaction.atomic
def reorder_lessons(*, section, lesson_ids_in_order: list[int]) -> list[Lesson]:
    return two_phase_reorder(Lesson, models.Q(section=section), lesson_ids_in_order)


@transaction.atomic
def compact_lessons(*, section):
    return compact(Lesson, models.Q(section=section))


@transaction.atomic
def publish_lesson(*, lesson: Lesson, by_user) -> Lesson:
    # Lesson is not an AuditMixin and has no published_at — ``publish()``
    # only flips ``is_published``. The parent course (lesson.section.course)
    # carries the audit trail so publish/unpublish stay traceable, mirroring
    # ``publish_course`` / ``publish_section``.
    from course.services import record_course_audit

    lesson.publish()
    lesson.save(update_fields=["is_published"])
    record_course_audit(
        course=lesson.section.course, actor=by_user, action="lesson.publish",
        metadata={"lesson_id": lesson.id},
    )
    return lesson


@transaction.atomic
def unpublish_lesson(*, lesson: Lesson, by_user) -> Lesson:
    from course.services import record_course_audit

    lesson.unpublish()
    lesson.save(update_fields=["is_published"])
    record_course_audit(
        course=lesson.section.course, actor=by_user, action="lesson.unpublish",
        metadata={"lesson_id": lesson.id},
    )
    return lesson
