from __future__ import annotations

import secrets

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from lms_catalog.models import Course, Lesson
from .models import (
    Certificate,
    CertificateSequence,
    CourseEnrollment,
    CourseProgress,
    LessonProgress,
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


@transaction.atomic
def mark_lesson_started(*, user, lesson: Lesson) -> LessonProgress:
    progress, _ = LessonProgress.objects.select_for_update().get_or_create(
        user=user,
        lesson=lesson,
        defaults={"is_started": True, "started_at": timezone.now()},
    )
    if not progress.is_started:
        progress.is_started = True
        progress.started_at = timezone.now()
        progress.save(update_fields=["is_started", "started_at", "last_seen_at"])
    return progress


@transaction.atomic
def mark_lesson_completed(
    *, user, lesson: Lesson, progress_percent: int = 100,
) -> LessonProgress:
    progress, _ = LessonProgress.objects.select_for_update().get_or_create(
        user=user, lesson=lesson,
    )
    was_completed = progress.is_completed
    progress.is_started = True
    progress.is_completed = True
    progress.progress_percent = max(progress.progress_percent, progress_percent)
    progress.started_at = progress.started_at or timezone.now()
    progress.completed_at = progress.completed_at or timezone.now()
    progress.save()

    course = lesson.section.course
    cp = calculate_course_progress(user=user, course=course)

    if not was_completed and cp.progress_percent == 100:
        issue_certificate_if_eligible(user=user, course=course)
    return progress


@transaction.atomic
def calculate_course_progress(*, user, course: Course) -> CourseProgress:
    total = Lesson.objects.filter(
        section__course=course,
        section__is_published=True,
        is_published=True,
    ).count()
    completed = LessonProgress.objects.filter(
        user=user,
        lesson__section__course=course,
        lesson__section__is_published=True,
        lesson__is_published=True,
        is_completed=True,
    ).count()
    percent = int((completed / total) * 100) if total else 0
    cp, _ = CourseProgress.objects.select_for_update().get_or_create(
        user=user, course=course,
    )
    cp.total_lessons_count = total
    cp.completed_lessons_count = completed
    cp.progress_percent = percent
    cp.save()
    if percent == 100:
        CourseEnrollment.objects.filter(
            user=user,
            course=course,
            status=CourseEnrollment.STATUS_ACTIVE,
        ).update(
            status=CourseEnrollment.STATUS_COMPLETED,
            completed_at=timezone.now(),
        )
    return cp


def _course_completed(user, course: Course) -> bool:
    cp = CourseProgress.objects.filter(user=user, course=course).first()
    return bool(cp and cp.progress_percent == 100)


def _final_quiz_passed(user, course: Course) -> bool:
    from lms_assessment.models import LessonQuiz
    final = LessonQuiz.objects.filter(course=course).first()
    if final is None:
        return True
    from quiz.models import Quiz
    sessions = Quiz.objects.filter(
        user=user, quiz_template=final.quiz_template, active=False,
    )
    from lms_assessment.services import compute_score_percent
    return any(
        compute_score_percent(s) >= final.required_score_percent for s in sessions
    )


def _generate_certificate_number() -> str:
    year = timezone.now().year
    with transaction.atomic():
        seq, _ = CertificateSequence.objects.select_for_update().get_or_create(year=year)
        seq.counter += 1
        seq.save()
        return f"QO-{year}-{seq.counter:04d}"


@transaction.atomic
def issue_certificate_if_eligible(*, user, course: Course) -> Certificate | None:
    if not _course_completed(user, course):
        return None
    if not _final_quiz_passed(user, course):
        return None
    existing = Certificate.objects.filter(
        user=user, course=course, revoked_at__isnull=True,
    ).first()
    if existing:
        return existing
    cert = Certificate.objects.create(
        user=user,
        course=course,
        certificate_number=_generate_certificate_number(),
        verification_token=secrets.token_urlsafe(32),
    )
    from .tasks import render_certificate_pdf
    transaction.on_commit(lambda: render_certificate_pdf.delay(cert.id))
    return cert
