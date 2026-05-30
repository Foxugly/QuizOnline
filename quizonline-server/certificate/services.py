from __future__ import annotations

import secrets
from datetime import datetime
from dateutil.relativedelta import relativedelta

from django.db import transaction
from django.utils import timezone

from course.models import Course
from .models import Certificate, CertificateSequence
from .notifications import notify_certificate_issued_on_commit


def _generate_certificate_number() -> str:
    year = timezone.now().year
    with transaction.atomic():
        seq, _ = CertificateSequence.objects.select_for_update().get_or_create(year=year)
        seq.counter += 1
        seq.save()
        return f"QO-{year}-{seq.counter:04d}"


def _course_completed(user, course: Course) -> bool:
    from enrollment.models import CourseProgress
    cp = CourseProgress.objects.filter(user=user, course=course).first()
    return bool(cp and cp.progress_percent == 100)


def _final_quiz_passed(user, course: Course) -> bool:
    from assessment.models import LessonQuiz
    final = LessonQuiz.objects.filter(course=course).first()
    if final is None:
        return True
    from quiz.models import Quiz
    sessions = Quiz.objects.filter(
        user=user, quiz_template=final.quiz_template, active=False,
    )
    from assessment.services import compute_score_percent
    return any(
        compute_score_percent(s) >= final.required_score_percent for s in sessions
    )


def _compute_expires_at(course: Course, *, now: datetime | None = None) -> datetime | None:
    """Compute the certificate expiration timestamp from the course's
    ``certificate_validity_months`` policy. Returns ``None`` when the
    policy is ``0`` (no expiration) — preserving the legacy behaviour
    for any course whose instructor never sets a validity window.

    Uses :class:`relativedelta` so ``13 months from 2026-01-31`` lands
    on ``2027-02-28`` (last day of February) rather than rolling over
    to March — the most natural interpretation for a calendar-aware
    "expires N months from issue" rule."""
    months = course.certificate_validity_months or 0
    if months <= 0:
        return None
    return (now or timezone.now()) + relativedelta(months=months)


@transaction.atomic
def issue_certificate_if_eligible(*, user, course: Course) -> Certificate | None:
    if not course.issues_certificate:
        # Opt-out: instructor disabled certificate emission for this
        # course (informational / optional content). Skip silently — the
        # learner still gets the completion email; only the certificate
        # row is not created.
        return None
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
        expires_at=_compute_expires_at(course),
    )
    notify_certificate_issued_on_commit(cert)
    from .tasks import render_certificate_pdf
    transaction.on_commit(lambda: render_certificate_pdf.delay(cert.id))
    return cert
