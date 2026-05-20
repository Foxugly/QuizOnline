from __future__ import annotations

import secrets

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
    notify_certificate_issued_on_commit(cert)
    from .tasks import render_certificate_pdf
    transaction.on_commit(lambda: render_certificate_pdf.delay(cert.id))
    return cert
