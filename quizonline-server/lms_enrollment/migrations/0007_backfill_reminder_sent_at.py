"""Backfill ``reminder_sent_at`` on every existing pending invitation.

Migration 0006 introduced the column with ``null=True``. Without a
backfill, the first run of ``send_course_invite_reminders`` after
deploy would treat every existing pending invitation as "never
reminded" — and email everyone whose ``expires_at`` already falls
inside the 72 h reminder window. On a tenant with a backlog of
pending invites that is a tangible email-surge risk (SES throttling,
inbox confusion for invitees who already saw the original mail
yesterday).

Stamp every pending row with ``now()`` so the cron treats them as
"already reminded". The next genuine reminder will fire only when a
manager explicitly re-issues (``resend_course_invite`` clears the
stamp) — and any net-new invitation gets its own clean cycle by
default.

One-way: there is no reverse data migration. The forward function is
idempotent on re-run (rows already stamped stay stamped) so a
re-apply is a no-op.
"""

from django.db import migrations
from django.utils import timezone


def stamp_existing_pending(apps, schema_editor):
    CourseInvite = apps.get_model("lms_enrollment", "CourseInvite")
    CourseInvite.objects.filter(
        status="pending",
        reminder_sent_at__isnull=True,
    ).update(reminder_sent_at=timezone.now())


class Migration(migrations.Migration):

    dependencies = [
        ("lms_enrollment", "0006_courseinvite_reminder_sent_at"),
    ]

    operations = [
        migrations.RunPython(stamp_existing_pending, migrations.RunPython.noop),
    ]
