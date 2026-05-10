from __future__ import annotations

from celery import shared_task
from django.utils import timezone

from core.delivery import process_pending_outbound_emails


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 5},
)
def deliver_outbound_emails_task(self, *, limit: int = 100) -> int:
    return process_pending_outbound_emails(limit=limit)


@shared_task
def notify_visibility_unlocks() -> dict[str, int]:
    """Send "result available" / "detail available" emails to participants
    of closed quiz sessions whose template visibility window just opened.

    A session is eligible when:
      - the user has actually started the quiz (started_at NOT NULL)
      - the session is closed (active=False)
      - the template visibility is SCHEDULED and available_at <= now
      - the corresponding notification timestamp is still NULL
    """
    from quiz.constants import VISIBILITY_SCHEDULED
    from quiz.models import Quiz
    from core.mailers.quiz import send_detail_available_email, send_result_available_email

    now = timezone.now()
    result_sent = 0
    detail_sent = 0

    result_due = Quiz.objects.select_related("quiz_template", "user").filter(
        active=False,
        started_at__isnull=False,
        result_notification_sent_at__isnull=True,
        quiz_template__result_visibility=VISIBILITY_SCHEDULED,
        quiz_template__result_available_at__lte=now,
    )
    for quiz in result_due:
        send_result_available_email(quiz)
        Quiz.objects.filter(pk=quiz.pk).update(result_notification_sent_at=now)
        result_sent += 1

    detail_due = Quiz.objects.select_related("quiz_template", "user").filter(
        active=False,
        started_at__isnull=False,
        detail_notification_sent_at__isnull=True,
        quiz_template__detail_visibility=VISIBILITY_SCHEDULED,
        quiz_template__detail_available_at__lte=now,
    )
    for quiz in detail_due:
        send_detail_available_email(quiz)
        Quiz.objects.filter(pk=quiz.pk).update(detail_notification_sent_at=now)
        detail_sent += 1

    return {"result_sent": result_sent, "detail_sent": detail_sent}
