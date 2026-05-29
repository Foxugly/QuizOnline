# LMS-extract refactor — production migration runbook

One-shot migration that flips the prod schema from the legacy
`lms_catalog_*` / `lms_enrollment_*` / `lms_assessment_*` tables onto the
new `course / lesson / block / enrollment / certificate / assessment`
namespace, and converts `Question`/`AnswerOption` rich-text fields into
polymorphic `block.Block` rows (Phase 3 of the refactor).

The two artefacts that drive the migration:

- **SQL** : [`deploy/migrate-lms-split.sql`](./migrate-lms-split.sql)
- **Management command** :
  `python manage.py migrate_lms_split` (wraps the SQL in a transaction,
  then chains `manage.py migrate` to run the Phase 3 data migration).

## What the migration does

1. **Renames tables** — every `lms_catalog_*` / `lms_enrollment_*` /
   `lms_assessment_*` table is renamed to its new-app equivalent
   (`course_course`, `lesson_lesson`, `block_block`, …). Sequences are
   renamed in lock-step so `nextval()` still works.
2. **Updates `django_content_type`** — every affected row gets its
   `app_label` (and for `ContentBlock` → `Block`, its `model`) updated so
   Django's ContentType cache resolves the model correctly.
3. **Reshapes `block_block`** for the polymorphic schema — drops the
   `lesson_id` FK + its uniqueness constraint, adds the new
   `target_content_type_id` / `target_object_id` / `block_role`
   columns, backfills them from the dropped `lesson_id`, and adds the new
   `UNIQUE(target_content_type, target_object_id, block_role, order)`
   constraint.
4. **Marks the new apps' `0001_initial` migrations as applied** in
   `django_migrations` (so `manage.py migrate` doesn't try to re-create
   the renamed tables).
5. **Removes the old app rows** from `django_migrations`.
6. **Then runs `manage.py migrate`** so the regular Django migration
   chain executes `question.0002_blocks_from_richtext` — converts the
   legacy `QuestionTranslation.description` / `.explanation` and
   `AnswerOptionTranslation.content` rich-text columns into `block.Block`
   rows, then drops those columns.

The whole thing is wrapped in **one transaction**. If anything fails, the
DB rolls back to the pre-migration state.

## Prerequisites

1. **Tested on a recent prod DB dump in staging.**
   - `pg_dump` prod → restore on staging
   - `python manage.py migrate_lms_split` → smoke-test the full app
2. **Maintenance window scheduled** (~30 min — most of which is buffer).
3. **DB backup taken IMMEDIATELY before** (see step 3 below).
4. The deployed code on the box is at the merge commit of
   `refactor/extract-lms-apps` (the new app layout).
   - **Do not** run the migration before pulling the new code:
     `manage.py migrate_lms_split` is shipped by that very branch.
5. The frontend bundle for the new code has been uploaded but not yet
   swapped (or accept a few seconds of UI 404s; the API is what matters).

## Migration steps

```bash
# 1. Stop services so nothing writes while we rename tables
sudo systemctl stop quizonline-celery-beat.service
sudo systemctl stop quizonline-celery.service
sudo systemctl stop quizonline-gunicorn.service

# 2. Take a final DB backup (snapshot path may differ — check deploy/README.md)
sudo -u django /var/www/django_websites/QuizOnline/deploy/backup-db.sh \
    --label pre-lms-split

# 3. Activate the venv + the project's environment
cd /var/www/django_websites/QuizOnline/quizonline-server
source ../venv/bin/activate
export DJANGO_ENV=prod
source /etc/quizonline/env

# 4. Dry-run — print the SQL so you can eyeball it
python manage.py migrate_lms_split --dry-run | less

# 5. Verify legacy row counts (record them in your maintenance log)
python manage.py migrate_lms_split --verify | tee /tmp/pre-counts.txt

# 6. APPLY
python manage.py migrate_lms_split 2>&1 | tee /tmp/migrate-lms-split.log

# 7. Verify new row counts match
python manage.py migrate_lms_split --verify | tee /tmp/post-counts.txt
diff /tmp/pre-counts.txt /tmp/post-counts.txt   # only the "legacy=" half should differ

# 8. Restart services
sudo systemctl start quizonline-gunicorn.service
sudo systemctl start quizonline-celery.service
sudo systemctl start quizonline-celery-beat.service

# 9. Smoke-test (see Smoke tests section below)
```

If step 6 fails, the SQL transaction rolls back automatically. The
command prints the diagnostic in red — capture it, redeploy the previous
code, and roll back per the section below.

## Smoke tests

Order matters — earlier steps cover the rename, later steps cover the
Phase 3 data migration.

1. `GET /api/health/` — quick check the box is up.
2. **Login + dashboard** — `/dashboard` should aggregate LMS courses /
   certificates / quizzes without 500ing.
3. **Catalog** — `/catalog` lists at least one course with a working
   cover image.
4. **Course detail** — `/course/<slug>` renders sections + lessons.
5. **Lesson view** — `/lesson/<id>` renders the block outline + the
   blocks themselves, including any pre-existing `rich_text` block.
6. **Question authoring** — open a `Question` editor and confirm the
   description / explanation render as block-shaped UI (Phase 3 backfill
   worked).
7. **Quiz play** — start a quiz, answer questions, see the explanation
   block on result reveal.
8. **Certificate** — open `/me/certificates` and download a PDF.

## Rollback

### Before step 8 (services not started yet)

The migration ran inside one transaction. If it failed mid-flight, the
DB is already at pre-migration state — just restart services with the
OLD code:

```bash
git checkout <previous-main-sha>
./deploy/redeploy.sh
sudo systemctl start quizonline-gunicorn.service quizonline-celery.service quizonline-celery-beat.service
```

If it succeeded but smoke-tests fail, **restore the DB backup from step 2**
and redeploy the previous code:

```bash
sudo systemctl stop quizonline-gunicorn.service quizonline-celery.service quizonline-celery-beat.service
sudo -u postgres pg_restore --clean --if-exists -d quizonline /path/to/pre-lms-split.dump
git checkout <previous-main-sha>
./deploy/redeploy.sh
sudo systemctl start quizonline-gunicorn.service quizonline-celery.service quizonline-celery-beat.service
```

### After step 8 (traffic is flowing on the new code)

The previous codebase does NOT match the new schema (it expects the
`lms_catalog_*` tables; we just renamed them). Two paths:

- **Roll the DB back together with the code** : take a fresh backup of
  whatever was written in the meantime, then restore the pre-migration
  backup + redeploy previous code. Any writes since the migration are
  lost.
- **Forward-fix on the new schema** : preferred if possible. Identify
  what broke, patch it on the new app layout, redeploy.

In practice we always prefer forward-fix once users have started writing
to the new schema. The DB-rollback path exists for a catastrophic
data-integrity issue only.

## Verification queries

After step 8, the operator can sanity-check the new shape directly:

```sql
-- All renamed tables exist and the old names are gone
SELECT table_name
  FROM information_schema.tables
 WHERE table_name LIKE 'lms_catalog%'
    OR table_name LIKE 'lms_enrollment%'
    OR table_name LIKE 'lms_assessment%';
-- → expect zero rows

-- ContentType rows are on the new app labels
SELECT app_label, model
  FROM django_content_type
 WHERE app_label IN ('lms_catalog', 'lms_enrollment', 'lms_assessment');
-- → expect zero rows

-- Block rows all have a target
SELECT COUNT(*) FROM block_block WHERE target_content_type_id IS NULL;
-- → expect 0

-- Phase 3 data migration created at least one block per question
-- (provided prod had any non-empty Question.description / explanation)
SELECT COUNT(*) FROM block_block bb
  JOIN django_content_type ct ON ct.id = bb.target_content_type_id
 WHERE ct.app_label = 'question' AND ct.model = 'question';
```

## Open questions / known limitations

- **Index names** : Django auto-names some indexes after the app label
  (e.g. `lms_catalog_domain__8449c2_idx`). Postgres keeps those names
  even after the table rename. They're cosmetic — they keep working —
  but they look stale. A future cosmetic-only migration can rename them
  with `ALTER INDEX ... RENAME TO ...` if desired.
- **`block_role` on existing rows** : every pre-existing `ContentBlock`
  becomes a `block_role='body'` Block by virtue of the column default.
  That's correct semantically (legacy blocks were all "body" content).
- **The FK constraint name on `block_block.target_content_type_id`**
  is hard-coded to
  `block_block_target_content_type_id_fk_django_content_type_id`. This
  matches the format Django would have chosen, but Django doesn't
  manage the constraint by name (it queries the catalog), so the exact
  string is forensic — the operator can inspect it with `\d block_block`
  in psql if curious.
