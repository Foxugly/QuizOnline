# Course-invite feature runbook

Operator-facing reference for the LMS course-invite flow shipped in
the May 2026 batch. Covers the three escalation levels of rollback,
the monitoring checklist for the first weeks after each deploy, and
the common failure modes with their diagnosis + fix.

> **Convention.** All commands assume you are SSH-connected to the
> production EC2 box as a user with `sudo`. The Django app lives at
> `/var/www/django_websites/QuizOnline/` and runs as user `django`.
> The repo on the box is at the same path with `redeploy.sh` in place.

---

## At a glance

| # | Surface | Where it lives | Failure mode | First-line response |
|---|---|---|---|---|
| 1 | Feature kill switch | SSM `/quizonline/prod/LMS_COURSE_INVITES_ENABLED` | Wave of broken invite write-flow (race, model bug, etc.) | Set to `False`, restart `env-fetch` + `gunicorn` |
| 2 | Bulk send cap | SSM `/quizonline/prod/LMS_COURSE_INVITE_BULK_MAX` (default 200) | A specific instructor floods the worker pool | Lower to 20-50 temporarily |
| 3 | Email outbox queue | Postgres `core_outboundemail`, delivered by Celery `core.tasks.deliver_outbound_emails_task` | SMTP outage — emails pile up but stay queued (no loss) | Wait it out OR `python manage.py shell -c "from core.delivery import process_pending_outbound_emails; process_pending_outbound_emails(limit=500)"` |
| 4 | Pending invite sweep | Celery beat `expire-pending-course-invites` (hourly) | Beat down → pending count climbs | Restart `quizonline-celery-beat` |
| 5 | Catalog visibility filter | `Course.objects.visible_to(user)` | Learner reports "I can see invite-only course I shouldn't" | Check the user has a pending invite OR an existing enrollment — both legitimate by design |
| 6 | Acceptance race | `accept_course_invite` row lock | Two ACTIVE enrollments on one invite (must NOT happen post-`d76014d`) | If observed, capture invite_id and report — the lock should prevent this |

---

## Rollback — escalate level by level, smallest blast radius first

### Level 1 — Feature flag (zero downtime, ~30 s)

When a recent change broke the WRITE path (send / accept / decline /
revoke / bulk) but the existing data is healthy. Stops new writes;
read endpoints keep responding so existing invitees can still see
their pending rows during triage.

```bash
# Flip the kill switch in SSM (note the SecureString to stay consistent
# with the rest of /quizonline/prod/*).
aws ssm put-parameter --region eu-west-1 \
  --name /quizonline/prod/LMS_COURSE_INVITES_ENABLED \
  --value "False" \
  --type SecureString --overwrite

# Pick it up on the box.
sudo systemctl restart quizonline-env-fetch quizonline-gunicorn
```

Verify:

```bash
curl -i -X POST -H "Authorization: Bearer <jwt>" \
  https://quizonline.foxugly.com/api/course/1/invite/ \
  -d '{"invitee_id": 2}'
# Expect: 503 Service Unavailable
```

Re-enable by setting the param back to `True` and restarting the same
services.

### Level 2 — Code revert (one redeploy, ~3 min)

When the bug is in the application code (not the model) and you want
to go back to the previous green commit. CI re-runs on the revert
commit, deploy pipeline takes over.

```bash
# From your laptop / dev box.
git checkout main
git pull
git revert <bad-sha>          # creates a revert commit
git push                      # triggers CI → deploy
```

Watch the GitHub Actions tab. Successful deploy takes ~3 min end-to-end.

### Level 3 — Schema rollback (downtime, manual SQL post-LMS-extract)

> **Post-refactor note (May 2026).** The LMS-extract refactor (PR #20)
> collapsed every legacy `lms_enrollment` migration into a single
> `enrollment/migrations/0001_initial.py`. Reverting a specific
> migration via `manage.py migrate enrollment <name>` is no longer
> possible — there is no intermediate state to migrate to. Level 3 is
> kept as a reference for SQLite/Postgres hand-craft rollback only.

Only relevant if the bug is in the **DB schema** of a CourseInvite-
related field (not the application code). For non-schema bugs, prefer
level 2 — the schema is additive and tolerates the previous code
shape just fine.

If you must roll back the schema by hand:

```bash
# 1. ALWAYS snapshot the DB first.
sudo -u django /var/www/django_websites/QuizOnline/deploy/backup-db.sh
# On the SQLite prod, ALSO take a literal copy for instant restore:
sudo cp /var/www/django_websites/QuizOnline/quizonline-server/db.sqlite3 \
        /var/backups/quizonline/db.sqlite3.pre-courseinvite-rollback-$(date +%Y%m%dT%H%M%S)

# 2. SSH to box, activate venv.
cd /var/www/django_websites/QuizOnline/quizonline-server
sudo -u django bash
source ../.venv/bin/activate

# 3. Stop services (no writes during the schema change).
sudo systemctl stop quizonline-gunicorn quizonline-celery quizonline-celery-beat

# 4. Run the recovery SQL by hand (sqlite3 / psql), then restart.
#    e.g. ``DROP TABLE enrollment_courseinvite;`` is the only safe path
#    on the merged-initial schema. Then update ``django_migrations`` to
#    mark a manual recovery sentinel so future migrate calls stay aligned.
sudo systemctl start quizonline-gunicorn quizonline-celery quizonline-celery-beat
```

After this kind of rollback the catalog visibility filter still
references the (now-missing) `invites__...` relation — Django catches
the schema mismatch as a 500. ALSO revert the application code (level 2)
so the visibility filter stops referencing the dropped relation.

---

## Monitoring checklist — what to watch

### Weekly health (5 min)

```sql
-- Pending invites by age. > 14d = sweep is broken (Beat down).
SELECT
  date_trunc('day', created_at) AS day,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending,
  COUNT(*) FILTER (WHERE status = 'accepted') AS accepted,
  COUNT(*) FILTER (WHERE status = 'declined') AS declined,
  COUNT(*) FILTER (WHERE status = 'expired') AS expired,
  COUNT(*) FILTER (WHERE status = 'revoked') AS revoked
FROM enrollment_courseinvite
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1 DESC;
```

Red flags:

* **`pending` > 0 for invites older than 14d** — the
  `expire-pending-course-invites` Celery beat task is not running.
  Check `sudo journalctl -u quizonline-celery-beat -n 200`.
* **`accepted / (accepted + declined + expired)` < 30 %** — invites
  are not landing. Likely culprits: emails in spam (check the
  bounce rate on SES / your provider), or learners can't find the
  link (recheck the topbar badge + `/me/invitations` page on
  prod).
* **`pending` > 1000 on a single day** — a runaway bulk send. Lower
  `LMS_COURSE_INVITE_BULK_MAX` to 20 and investigate which
  instructor triggered it.

### Daily — outbox queue depth

```sql
SELECT
  COUNT(*) FILTER (WHERE sent_at IS NULL)                          AS pending,
  COUNT(*) FILTER (WHERE last_error <> '')                         AS errored,
  MAX(EXTRACT(EPOCH FROM (NOW() - created_at)) FILTER (WHERE sent_at IS NULL)) AS oldest_pending_seconds
FROM core_outboundemail;
```

Red flag: **`oldest_pending_seconds` > 600** — Celery worker is
stuck. Check `sudo journalctl -u quizonline-celery -n 200`.

### Sentry — recommended alert rules

Configure in the Sentry UI (no code change needed). Events for the
course-invite flow now carry the `course_id` / `invite_id` /
`invitee_id` tags so these alerts can scope:

| Alert | Condition | Action |
|---|---|---|
| `invite-send-burst` | More than 50 events tagged `course_id` in 5 min on `invite_user_to_course` | Page Renaud |
| `accept-race` | Any `IntegrityError` event with `invite_id` tag on `accept_course_invite` | Page Renaud — the lock should have prevented this |
| `sweep-down` | Cron heartbeat for `expire_pending_course_invites` misses two hours in a row | Email Renaud |

---

## Common failure modes

### "Marie says she did not receive the email"

1. Check the outbox row:
   ```sql
   SELECT id, sent_at, last_error
   FROM core_outboundemail
   WHERE 'marie@example.com' = ANY(recipients)
   ORDER BY created_at DESC LIMIT 3;
   ```
2. `sent_at IS NULL` + `last_error = ''` → Celery worker stuck. Run
   `python manage.py shell -c "from core.delivery import process_pending_outbound_emails as p; p(limit=100)"` to flush.
3. `sent_at IS NOT NULL` → the mail left QuizOnline. Marie should
   check spam OR her email provider's logs. The outbound was
   successful from our side.
4. `last_error` set → fix that error first (SMTP creds rotated?
   recipient bounces?).

### "The bell badge stays at 1 even after I accepted"

The `LmsInvitationCountService` refreshes on accept / decline
callbacks. If the badge is stale, the refresh signal didn't fire.
Reproduce: open DevTools, accept an invite, watch for a
`GET /api/me/invitations/` request in the network tab — it
should fire right after the accept call. If missing, file a bug
with the call sequence.

### "Two `ACTIVE` enrollments on one invite"

Should NOT happen post-`d76014d` (select_for_update closes the
race). If observed:

1. Capture: `SELECT * FROM enrollment_courseenrollment WHERE
   course_id = X AND user_id = Y;`
2. Keep the older row (lower `enrolled_at`), delete the duplicate.
3. Report the invite_id — the lock should have prevented this. We
   want a Sentry trace to debug.

---

## Manual recovery commands

### Re-fire the auto-expire sweep on demand

```bash
sudo -u django /var/www/django_websites/QuizOnline/.venv/bin/python \
  /var/www/django_websites/QuizOnline/quizonline-server/manage.py shell -c \
  'from enrollment.tasks import expire_pending_course_invites; print(expire_pending_course_invites())'
```

Returns the count of rows updated. Useful when Celery beat skipped
a window.

### Force-resend an invitation (admin path)

```python
# python manage.py shell
from enrollment.models import CourseInvite
from enrollment.services import resend_course_invite
from django.contrib.auth import get_user_model

invite = CourseInvite.objects.get(id=42)
admin = get_user_model().objects.get(username="admin")
resend_course_invite(invite=invite, sender=admin)
```

Bumps `last_sent_at` + the expiry, queues a fresh email through the
outbox.

### Revoke every pending invite for one course (instructor leaves)

```python
# python manage.py shell
from django.utils import timezone
from enrollment.models import CourseInvite

CourseInvite.objects.filter(
    course_id=42,
    status=CourseInvite.STATUS_PENDING,
).update(
    status=CourseInvite.STATUS_REVOKED,
    revoked_at=timezone.now(),
)
```

---

## Related references

* Backend feature commits: `fa2ffe6` → `e034b34` (May 2026)
* Backend tests: `quizonline-server/enrollment/tests/test_course_invite.py`
* E2E spec: `quizonline-frontend/e2e/fullstack/course-invite-fullstack.spec.ts`
* Notification kinds: `customuser/notifications.py` — `KIND_COURSE_INVITE_*` + `KIND_COURSE_ENROLLMENT_REQUEST`
* Email templates: `quizonline-server/templates/emails/lms/course-invite-*`
* Sweep task: `quizonline-server/enrollment/tasks.py::expire_pending_course_invites`
