from __future__ import annotations


from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils.translation import gettext_lazy as _

from lms_catalog.models import Course, Lesson
from .models import (
    CourseEnrollment,
    CourseProgress,
)


def _is_instructor(user, course: Course) -> bool:
    if user is None:
        return False
    if getattr(user, "is_superuser", False):
        return True
    return user.can_manage_domain(course.domain)


@transaction.atomic
def enroll_user_to_course(*, user, course: Course, requested_by=None) -> CourseEnrollment:
    existing = (
        CourseEnrollment.objects.select_for_update()
        .filter(user=user, course=course)
        .first()
    )
    if existing:
        return existing

    if course.enrollment_mode == Course.ENROLL_INVITE:
        if not _is_instructor(requested_by, course):
            raise PermissionDenied(_("Course is invite-only."))
        status = CourseEnrollment.STATUS_ACTIVE
    elif course.enrollment_mode == Course.ENROLL_APPROVAL:
        status = CourseEnrollment.STATUS_PENDING
    else:
        status = CourseEnrollment.STATUS_ACTIVE

    enrollment = CourseEnrollment.objects.create(
        user=user,
        course=course,
        status=status,
        created_by=requested_by or user,
    )
    _ensure_course_progress(user, course)
    return enrollment


@transaction.atomic
def approve_enrollment(*, enrollment: CourseEnrollment, decided_by) -> CourseEnrollment:
    if not _is_instructor(decided_by, enrollment.course):
        raise PermissionDenied()
    if enrollment.status != CourseEnrollment.STATUS_PENDING:
        raise ValidationError(_("Enrollment is not pending."))
    enrollment.status = CourseEnrollment.STATUS_ACTIVE
    enrollment.updated_by = decided_by
    enrollment.save(update_fields=["status", "updated_by"])
    return enrollment


@transaction.atomic
def reject_enrollment(
    *, enrollment: CourseEnrollment, decided_by, reason: str = "",
) -> CourseEnrollment:
    if not _is_instructor(decided_by, enrollment.course):
        raise PermissionDenied()
    if enrollment.status != CourseEnrollment.STATUS_PENDING:
        raise ValidationError(_("Enrollment is not pending."))
    enrollment.status = CourseEnrollment.STATUS_CANCELLED
    enrollment.updated_by = decided_by
    enrollment.save(update_fields=["status", "updated_by"])
    return enrollment


def _ensure_course_progress(user, course: Course) -> CourseProgress:
    total = Lesson.objects.filter(
        section__course=course,
        section__is_published=True,
        is_published=True,
    ).count()
    cp, _created = CourseProgress.objects.get_or_create(
        user=user,
        course=course,
        defaults={"total_lessons_count": total},
    )
    return cp
