# Migrate QuizOnline from SQLite to PostgreSQL on the EC2 host

Runbook for the in-place cut-over from `db.sqlite3` to a local
PostgreSQL instance running on the same EC2 as the app. Designed for
the small-volume case (`< 50 MB` SQLite); above that, swap step 7
(`dumpdata` / `loaddata`) for `pgloader` — see the *Larger volumes*
section at the bottom.

All commands run as `root` on the EC2 unless prefixed with
`sudo -u django` (or `sudo -u postgres`). The project root is
`/var/www/django_websites/QuizOnline/`.

---

## 0. Pre-flight (a few minutes, no downtime)

1. Confirm `psycopg` is present in `requirements.txt` (this PR adds it).
2. Open a second SSH session to the EC2 so you can rollback quickly.
3. Check the SQLite size — large dumps need `pgloader` instead of
   `dumpdata`:

   ```bash
   du -h /var/www/django_websites/QuizOnline/quizonline-server/db.sqlite3
   ```

4. Confirm the systemd backup timer fired recently (or run it now):

   ```bash
   sudo systemctl list-timers quizonline-backup
   sudo -u django bash /var/www/django_websites/QuizOnline/deploy/backup-db.sh
   ls -lh /var/backups/quizonline | tail -3
   ```

   You should see a fresh `quizonline-*.sqlite3.gz`.

---

## 1. Install PostgreSQL on the host

```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
sudo -u postgres psql -c '\conninfo'
```

The default Debian/Ubuntu package binds to `127.0.0.1:5432` with peer
auth on the local socket — exactly what we want.

---

## 2. Create the `quizonline` role + database

Generate a strong password locally (don't reuse `SECRET_KEY`):

```bash
PG_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
echo "PG_PASSWORD=$PG_PASSWORD"   # write this down for step 3
```

Then create the role and DB:

```bash
sudo -u postgres psql <<EOF
CREATE USER quizonline WITH PASSWORD '$PG_PASSWORD';
CREATE DATABASE quizonline
  OWNER quizonline
  ENCODING 'UTF8'
  LC_COLLATE 'C.UTF-8'
  LC_CTYPE   'C.UTF-8'
  TEMPLATE template0;
GRANT ALL PRIVILEGES ON DATABASE quizonline TO quizonline;
EOF
```

Quick sanity check that the role can connect:

```bash
PGPASSWORD="$PG_PASSWORD" psql -h 127.0.0.1 -U quizonline -d quizonline -c 'SELECT 1;'
```

---

## 3. Stage the new `DATABASE_URL` in the env file

The prod app fetches `.env` from AWS SSM Parameter Store at boot via
`deploy/fetch-env-from-ssm.sh`. There are two ways to roll out the new
URL — pick one:

### Option A (recommended for first run): edit the live `.env` directly

This sidesteps the SSM round-trip and is faster to iterate on. After
the migration succeeds, push the same value back to SSM with the
`seed-parameter-store` script so a future re-deploy doesn't revert.

```bash
sudo -u django bash -c '
  set -e
  cd /var/www/django_websites/QuizOnline/quizonline-server
  cp .env .env.before-postgres
  sed -i "s#^DATABASE_URL=.*#DATABASE_URL=postgres://quizonline:'$PG_PASSWORD'@localhost:5432/quizonline#" .env
  grep ^DATABASE_URL .env
'
```

### Option B (SSM-first): seed Parameter Store, then re-fetch

```bash
aws ssm put-parameter \
  --name /quizonline/prod/DATABASE_URL \
  --value "postgres://quizonline:$PG_PASSWORD@localhost:5432/quizonline" \
  --type SecureString \
  --overwrite
sudo systemctl restart quizonline-env-fetch.service
```

In both cases, leave the SQLite file untouched — it's the rollback
path.

---

## 4. Install the psycopg driver in the venv

The driver is already in `requirements.txt`, so a regular `pip install`
picks it up. Run it as the `django` user (the venv is owned by them):

```bash
sudo -u django bash -c '
  cd /var/www/django_websites/QuizOnline &&
  source .venv/bin/activate &&
  pip install -r quizonline-server/requirements.txt
'
```

Verify the driver loads cleanly:

```bash
sudo -u django /var/www/django_websites/QuizOnline/.venv/bin/python -c \
  "import psycopg; print(psycopg.__version__)"
```

---

## 5. Create the schema on the empty PostgreSQL database

```bash
sudo -u django bash -c '
  cd /var/www/django_websites/QuizOnline/quizonline-server &&
  source /var/www/django_websites/QuizOnline/.venv/bin/activate &&
  python manage.py migrate --noinput
'
```

The `migrate --noinput` should run all migrations cleanly against the
empty postgres DB. Spot-check a table or two:

```bash
sudo -u postgres psql -d quizonline -c '\dt' | head
sudo -u postgres psql -d quizonline -c 'SELECT COUNT(*) FROM auth_user;'
```

The user count is zero — the data load comes next.

---

## 6. Stop the app so no writes hit SQLite during the dump

This is the start of the downtime window (~3-10 min for a < 50 MB DB).

```bash
sudo systemctl stop quizonline-celery-beat quizonline-celery quizonline-gunicorn
```

---

## 7. Dump from SQLite and load into PostgreSQL

The cleanest path for small volumes: re-point Django at the SQLite file
just for the `dumpdata`, then load with the new URL.

```bash
sudo -u django bash -c '
  set -e
  cd /var/www/django_websites/QuizOnline/quizonline-server
  source /var/www/django_websites/QuizOnline/.venv/bin/activate

  # 7a. Dump every app, naturalize FKs/PKs (skip system tables Django
  #     re-creates on migrate).
  DATABASE_URL=sqlite:///db.sqlite3 python manage.py dumpdata \
    --natural-foreign --natural-primary \
    --exclude=contenttypes --exclude=auth.permission \
    --exclude=sessions --exclude=admin.logentry \
    --indent=2 \
    --output=/tmp/quizonline-data.json

  echo "dump size: $(du -h /tmp/quizonline-data.json | cut -f1)"

  # 7b. Load into the new postgres DB (uses the current .env URL).
  python manage.py loaddata /tmp/quizonline-data.json
'
```

`loaddata` writes every row with explicit primary keys, which leaves
the postgres auto-increment sequences at zero. Without a reset, the
next `INSERT` collides with the loaded ids. Reset every app's
sequences in one shot:

```bash
sudo -u django bash -c '
  cd /var/www/django_websites/QuizOnline/quizonline-server &&
  source /var/www/django_websites/QuizOnline/.venv/bin/activate &&
  python <<PY
import django
django.setup()
from django.apps import apps
from django.core.management import call_command
labels = [a.label for a in apps.get_app_configs() if a.models_module]
print(f"resetting sequences for: {labels}")
call_command("sqlsequencereset", *labels, stdout=open("/tmp/sqlreset.sql", "w"))
PY
python manage.py dbshell < /tmp/sqlreset.sql
'
```

Quick verification — the postgres counts should match the SQLite
counts. Spot-check the heavy tables:

```bash
sudo -u postgres psql -d quizonline -c "
  SELECT 'auth_user' AS t, COUNT(*) FROM auth_user
  UNION ALL SELECT 'domain', COUNT(*) FROM domain_domain
  UNION ALL SELECT 'course', COUNT(*) FROM course_course
  UNION ALL SELECT 'lesson', COUNT(*) FROM lesson_lesson
  UNION ALL SELECT 'block',  COUNT(*) FROM block_block;
"
```

---

## 8. Restart the app + smoke test

```bash
sudo systemctl start quizonline-gunicorn quizonline-celery quizonline-celery-beat
sleep 5
curl -sI http://127.0.0.1:8000/api/health/ | head -1
sudo journalctl -u quizonline-gunicorn -n 50 --no-pager
```

Then in a browser, hit the live URL and walk through:

- Login (existing user, password unchanged)
- Catalog + open a course detail
- Lesson view with quiz block
- Admin panel (`/admin/`)

If anything blows up → **rollback** (next section).

---

## 9. Rollback (if anything goes wrong)

The SQLite file at `quizonline-server/db.sqlite3` is untouched
throughout. To revert:

```bash
sudo systemctl stop quizonline-celery-beat quizonline-celery quizonline-gunicorn
sudo -u django cp /var/www/django_websites/QuizOnline/quizonline-server/.env.before-postgres \
  /var/www/django_websites/QuizOnline/quizonline-server/.env
sudo systemctl start quizonline-gunicorn quizonline-celery quizonline-celery-beat
```

Then push the SQLite URL back to SSM if Option B was used in step 3,
so a fresh deploy doesn't re-pull the postgres URL.

---

## 10. Post-cutover housekeeping (no downtime)

1. **Persist the URL to SSM** (if step 3 used Option A):

   ```bash
   aws ssm put-parameter \
     --name /quizonline/prod/DATABASE_URL \
     --value "postgres://quizonline:$PG_PASSWORD@localhost:5432/quizonline" \
     --type SecureString \
     --overwrite
   ```

2. **Test the backup script against the new DB**:

   ```bash
   sudo -u django bash /var/www/django_websites/QuizOnline/deploy/backup-db.sh
   ls -lh /var/backups/quizonline | tail -3
   ```

   You should see a `*.sql.gz` (postgres dump) alongside the older
   `*.sqlite3.gz` archives. The script already handles both schemes.

3. **Tune PostgreSQL for the host's RAM** — Debian's default
   `shared_buffers = 128MB` is fine for the first weeks. Re-visit
   when concurrent users climb above 50.

4. **Keep the SQLite file for a week** before deleting:

   ```bash
   sudo -u django mv /var/www/django_websites/QuizOnline/quizonline-server/db.sqlite3 \
     /var/backups/quizonline/db.sqlite3.pre-postgres-$(date -u +%Y%m%d)
   ```

   Then delete after a week's clean operation.

---

## Larger volumes (> 500 MB SQLite)

`dumpdata` + `loaddata` becomes slow (JSON serialization in pure
Python). Replace step 7 with `pgloader`:

```bash
sudo apt-get install -y pgloader
echo "load database
  from sqlite:///var/www/django_websites/QuizOnline/quizonline-server/db.sqlite3
  into postgresql://quizonline:$PG_PASSWORD@localhost/quizonline
  with include drop, create tables, create indexes, reset sequences
  set work_mem to '64MB', maintenance_work_mem to '512MB';" > /tmp/migrate.load

pgloader /tmp/migrate.load
```

`pgloader` resets sequences on its own — skip the `sqlsequencereset`
step. Everything else (smoke test / rollback) is unchanged.
