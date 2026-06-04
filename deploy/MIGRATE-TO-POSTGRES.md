# Migrate QuizOnline from SQLite to PostgreSQL on the EC2 host

> **⚠️ HISTORICAL (done 2026-06-04).** quizonline now runs on the box-local
> PostgreSQL via the fleet **`DB_*` 6-var convention** (OPERATIONS.md §3.13), not
> `DATABASE_URL`. This runbook is kept as a record of the original cut-over; the
> `DATABASE_URL`-based commands below are superseded by `DB_ENGINE`/`DB_NAME`/`DB_USER`/
> `DB_PASSWORD`/`DB_HOST`/`DB_PORT` in `/quizonline/prod/*`.

Runbook for the in-place cut-over from `db.sqlite3` to a local
PostgreSQL instance running on the same EC2 as the app. Designed for
the small-volume case (`< 50 MB` SQLite); above that, swap step 7
(`dumpdata` / `loaddata`) for `pgloader` — see the *Larger volumes*
section at the bottom.

All commands run as `root` on the EC2 (`sudo -s`) unless prefixed
with `sudo -u <user>`. The project root is
`/var/www/django_websites/QuizOnline/`.

---

## Architecture notes (read before starting)

- **Venv:** `/var/www/django_websites/QuizOnline/quizonline-server/.venv/`
  (inside the server subdir, not at the repo root).
- **Env file:** `/run/quizonline/.env` (tmpfs, populated at boot by
  `quizonline-env-fetch.service` from AWS SSM Parameter Store under
  the `/quizonline/prod/` prefix). There is **no on-disk
  `quizonline-server/.env`** — Django's `read_env()` finds nothing
  there, all env vars arrive via the systemd process environment.
- **Why not `set -a; source /run/quizonline/.env`:** the file contains
  secrets with shell-special characters (`&`, `$`, backticks, …) that
  bash interprets when sourcing — `SECRET_KEY=foo&bar` gets parsed
  as a background job. Always load the env via systemd-run's
  `--property=EnvironmentFile=…` (which uses systemd's own parser,
  the same one gunicorn already uses), never `source` it in a shell.

---

## 0. Pre-flight (a few minutes, no downtime)

1. Confirm `psycopg` is present in the venv (PR #48 added it to
   `requirements.txt`):

   ```bash
   /var/www/django_websites/QuizOnline/quizonline-server/.venv/bin/python \
     -c "import psycopg; print('psycopg', psycopg.__version__)"
   ```

   You should see `psycopg 3.2.6` or later. If not → run the deploy
   pipeline once (it does a fresh `pip install -r requirements.txt`).

2. Open a second SSH session to the EC2 so you can rollback quickly.

3. Check the SQLite size — large dumps need `pgloader` instead of
   `dumpdata`:

   ```bash
   du -h /var/www/django_websites/QuizOnline/quizonline-server/db.sqlite3
   ```

4. Run a fresh backup of the live SQLite (the backup dir may not
   exist yet — the daily timer might never have run). The script
   needs `ENV_FILE=` overridden because the default points at a
   path that doesn't exist in this deployment:

   ```bash
   mkdir -p /var/backups/quizonline
   chown django:www-data /var/backups/quizonline
   chmod 770 /var/backups/quizonline
   sudo -u django ENV_FILE=/run/quizonline/.env \
     bash /var/www/django_websites/QuizOnline/deploy/backup-db.sh
   ls -lh /var/backups/quizonline | tail -3
   ```

   You should see a fresh `quizonline-*.sqlite3.gz`.

---

## 1. Install PostgreSQL on the host

```bash
apt-get update
apt-get install -y postgresql postgresql-contrib
systemctl enable --now postgresql
sudo -u postgres psql -c '\conninfo'
```

The default Debian/Ubuntu package binds to `127.0.0.1:5432` with peer
auth on the local socket — exactly what we want.

---

## 2. Create the `quizonline` role + database

Generate a strong password (don't reuse `SECRET_KEY`):

```bash
PG_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
echo "PG_PASSWORD=$PG_PASSWORD"   # note it down for step 3
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

## 3. Stage the new `DATABASE_URL` in the runtime env

The prod app reads `/run/quizonline/.env` at boot. We edit the file
in place (it's a tmpfs file, gets re-fetched from SSM on next boot —
step 10 pushes the new value to SSM so the change survives a reboot).

```bash
# Backup the current /run env file (for rollback)
cp /run/quizonline/.env /run/quizonline/.env.before-postgres

# Replace the DATABASE_URL line
sed -i "s#^DATABASE_URL=.*#DATABASE_URL=postgres://quizonline:$PG_PASSWORD@localhost:5432/quizonline#" /run/quizonline/.env

# Verify
grep ^DATABASE_URL /run/quizonline/.env
```

⚠️ At this point gunicorn is still running on SQLite — `EnvironmentFile=`
loads the file once at process start, so the running process keeps
the old value. The next `manage.py` command we run will be the first
to hit postgres.

---

## 4. Confirm the driver loads

(The driver was installed in pre-flight. This is a 1-line smoke
test that Django can boot with the new URL.)

```bash
systemd-run --pipe --wait --quiet --collect \
  --uid=django --gid=www-data \
  --property=EnvironmentFile=/run/quizonline/.env \
  --working-directory=/var/www/django_websites/QuizOnline/quizonline-server \
  /var/www/django_websites/QuizOnline/quizonline-server/.venv/bin/python manage.py check
```

Expect `System check identified no issues`. If you see a Python
traceback referencing `psycopg.errors.OperationalError`, the
connection string is wrong — re-check step 3.

---

## 5. Create the schema on the empty PostgreSQL database

```bash
systemd-run --pipe --wait --quiet --collect \
  --uid=django --gid=www-data \
  --property=EnvironmentFile=/run/quizonline/.env \
  --working-directory=/var/www/django_websites/QuizOnline/quizonline-server \
  /var/www/django_websites/QuizOnline/quizonline-server/.venv/bin/python manage.py migrate --noinput
```

Expect 60+ `Applying <app>.<migration>... OK` lines. Spot-check a
couple of tables (the user table is `customuser_customuser`, not
`auth_user` — the project ships a custom user model):

```bash
sudo -u postgres psql -d quizonline -c '\dt' | head
sudo -u postgres psql -d quizonline -c 'SELECT COUNT(*) FROM customuser_customuser;'
```

The user count is zero — the data load comes next.

---

## 6. Stop the app so no writes hit SQLite during the dump

This is the start of the downtime window (~3-10 min for a < 50 MB DB).

```bash
systemctl stop quizonline-celery-beat quizonline-celery quizonline-gunicorn
```

Verify gunicorn is `inactive (dead)`:

```bash
systemctl status quizonline-gunicorn --no-pager | head -3
```

---

## 7. Dump from SQLite, load into PostgreSQL, reset sequences

### 7a. Dump from SQLite

`systemd-run --setenv=DATABASE_URL=…` does NOT reliably override the
value loaded from `--property=EnvironmentFile=` (the file wins). Use
a Python wrapper that parses `.env` line-by-line (handling
shell-special characters cleanly) and overrides `DATABASE_URL` in
`os.environ` before invoking `dumpdata`.

Create `/tmp/dump-sqlite.py`:

```bash
cat > /tmp/dump-sqlite.py <<'PYEOF'
import os, subprocess, sys
with open('/run/quizonline/.env') as f:
    for line in f:
        line = line.rstrip('\n')
        if not line or line.startswith('#'):
            continue
        k, _, v = line.partition('=')
        os.environ[k] = v
os.environ['DATABASE_URL'] = 'sqlite:///db.sqlite3'
os.chdir('/var/www/django_websites/QuizOnline/quizonline-server')
subprocess.run([
    sys.executable, 'manage.py', 'dumpdata',
    '--natural-foreign', '--natural-primary',
    '--exclude=contenttypes', '--exclude=auth.permission',
    '--exclude=sessions', '--exclude=admin.logentry',
    '--indent=2', '--output=/tmp/quizonline-data.json',
], check=True)
PYEOF
```

Run it:

```bash
sudo -u django /var/www/django_websites/QuizOnline/quizonline-server/.venv/bin/python /tmp/dump-sqlite.py
ls -lh /tmp/quizonline-data.json
head -c 300 /tmp/quizonline-data.json
```

The JSON should weigh several hundred KB (roughly ~50–80% of the
SQLite size) and start with real fixture lines like
`{"model": "core.outboundemail", "pk": 1, ...`. If the file is 4
bytes (`[]\n`), the override didn't take and dumpdata ran against
the empty postgres DB — re-check the script.

### 7b. Load into PostgreSQL

Postgres is already in `/run/quizonline/.env`, no override needed:

```bash
systemd-run --pipe --wait --quiet --collect \
  --uid=django --gid=www-data \
  --property=EnvironmentFile=/run/quizonline/.env \
  --working-directory=/var/www/django_websites/QuizOnline/quizonline-server \
  /var/www/django_websites/QuizOnline/quizonline-server/.venv/bin/python manage.py loaddata /tmp/quizonline-data.json
```

Expect `Installed XXXX object(s) from 1 fixture(s)`. Spot-check:

```bash
sudo -u postgres psql -d quizonline -c "
  SELECT 'customuser' AS t, COUNT(*) FROM customuser_customuser
  UNION ALL SELECT 'domain',     COUNT(*) FROM domain_domain
  UNION ALL SELECT 'course',     COUNT(*) FROM course_course
  UNION ALL SELECT 'lesson',     COUNT(*) FROM lesson_lesson
  UNION ALL SELECT 'block',      COUNT(*) FROM block_block;
"
```

Counts should match the live data you remember (or what was in the
pre-migration SQLite).

### 7c. Reset the postgres sequences

`loaddata` writes every row with explicit primary keys, which leaves
the postgres auto-increment sequences at zero. Without a reset, the
next `INSERT` collides with the loaded ids. List every app explicitly
(`manage.py sqlsequencereset` takes app labels as positional args):

```bash
systemd-run --pipe --wait --quiet --collect \
  --uid=django --gid=www-data \
  --property=EnvironmentFile=/run/quizonline/.env \
  --working-directory=/var/www/django_websites/QuizOnline/quizonline-server \
  /var/www/django_websites/QuizOnline/quizonline-server/.venv/bin/python manage.py sqlsequencereset \
    admin assessment auth block certificate contenttypes core course customuser domain enrollment language lesson question quiz sessions subject token_blacklist \
  > /tmp/reset-seq.sql

wc -l /tmp/reset-seq.sql
head -3 /tmp/reset-seq.sql
```

Should be 30+ lines starting with `BEGIN;`. Apply via psql:

```bash
PG_PASSWORD=$(grep ^DATABASE_URL /run/quizonline/.env | sed 's|.*//quizonline:||; s|@.*||')
PGPASSWORD="$PG_PASSWORD" psql -h 127.0.0.1 -U quizonline -d quizonline -f /tmp/reset-seq.sql 2>&1 | tail -5
```

Expect a stream of `setval` results then `COMMIT`.

---

## 8. Restart the app + smoke test

```bash
systemctl start quizonline-gunicorn quizonline-celery quizonline-celery-beat
sleep 3
systemctl status quizonline-gunicorn --no-pager | head -5
journalctl -u quizonline-gunicorn -n 20 --no-pager | tail -10
```

Then in a browser, hit the live URL (cache-busting reload) and walk
through:

- Login (existing user, password unchanged)
- Catalog + open a course detail
- Lesson view with quiz block
- Admin panel (`/admin/`)
- At least one write action (create / edit something)

If anything blows up → **rollback** (next section).

---

## 9. Rollback (if anything goes wrong)

The SQLite file at `quizonline-server/db.sqlite3` is untouched
throughout. To revert:

```bash
systemctl stop quizonline-celery-beat quizonline-celery quizonline-gunicorn
cp /run/quizonline/.env.before-postgres /run/quizonline/.env
systemctl start quizonline-gunicorn quizonline-celery quizonline-celery-beat
```

Push the SQLite URL back to SSM (see step 10.1) so a fresh deploy or
reboot doesn't re-pull the postgres URL.

---

## 10. Post-cutover housekeeping (no downtime)

### 10.1 — Persist the URL to SSM (critical)

Without this, the next reboot or deploy fires
`quizonline-env-fetch.service` which re-pulls `sqlite:///db.sqlite3`
from SSM and overwrites `/run/quizonline/.env` — the app boots on
empty SQLite. **Do this before logging off.**

The EC2 default shell credentials may not have `ssm:PutParameter`
permission (the IAM identity attached to the shell is different
from the EC2 instance role that env-fetch uses). The simplest
reliable path is the AWS console:

1. AWS Console → Systems Manager → Parameter Store.
2. Find `/quizonline/prod/DATABASE_URL`.
3. Edit, change value to
   `postgres://quizonline:<PASSWORD>@localhost:5432/quizonline`,
   set type to `SecureString` (the value now contains a password).
4. Save.

Verify the new value survives an env-fetch (which mirrors what
happens at every boot):

```bash
systemctl restart quizonline-env-fetch.service
grep ^DATABASE_URL /run/quizonline/.env
```

Must print the postgres URL, NOT `sqlite:///db.sqlite3`.

If you happen to have the right IAM perms in your CLI session, the
equivalent CLI call is:

```bash
aws ssm put-parameter \
  --name /quizonline/prod/DATABASE_URL \
  --value "postgres://quizonline:$PG_PASSWORD@localhost:5432/quizonline" \
  --type SecureString \
  --overwrite \
  --region eu-west-1
```

### 10.2 — Test the backup script against postgres

```bash
sudo -u django ENV_FILE=/run/quizonline/.env \
  bash /var/www/django_websites/QuizOnline/deploy/backup-db.sh
ls -lh /var/backups/quizonline/ | tail -3
```

You should see a fresh `quizonline-*.sql.gz` (postgres dump via
`pg_dump`) alongside the pre-migration `*.sqlite3.gz`. The script
auto-detects the URL scheme and uses the right dumper.

### 10.3 — Make sure the daily backup timer is enabled

Earlier installs may never have enabled the systemd timer:

```bash
systemctl is-enabled quizonline-backup.timer
```

If `not-found` (the units were never copied to `/etc/systemd/system/`)
or `disabled`:

```bash
cp /var/www/django_websites/QuizOnline/deploy/quizonline-backup.service /etc/systemd/system/
cp /var/www/django_websites/QuizOnline/deploy/quizonline-backup.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now quizonline-backup.timer
systemctl list-timers quizonline-backup --no-pager
```

The service unit carries `Environment="ENV_FILE=/run/quizonline/.env"`
so the script reads the right env on every fire — no additional
override needed.

Smoke-test by triggering a manual run:

```bash
systemctl start quizonline-backup.service
journalctl -u quizonline-backup.service -n 10 --no-pager | tail -5
```

Expect a fresh `*.sql.gz` in `/var/backups/quizonline/`.

### 10.4 — Keep the SQLite file for a week, then archive

The pre-migration `db.sqlite3` is your safety net while the new
postgres install settles. After ~7 days of clean operation:

```bash
sudo -u django mv \
  /var/www/django_websites/QuizOnline/quizonline-server/db.sqlite3 \
  /var/backups/quizonline/db.sqlite3.pre-postgres-$(date -u +%Y%m%d)
```

Delete entirely once you're confident.

### 10.5 — Tune PostgreSQL when usage grows

Debian's default `shared_buffers = 128MB` is fine for the first
weeks. Re-visit when concurrent users climb above 50 or when
the working set exceeds a few hundred MB. The standard knobs to
revisit are in `/etc/postgresql/16/main/postgresql.conf`:
`shared_buffers`, `work_mem`, `effective_cache_size`,
`max_connections`.

---

## Larger volumes (> 500 MB SQLite)

`dumpdata` + `loaddata` becomes slow (JSON serialization in pure
Python). Replace step 7 with `pgloader`:

```bash
apt-get install -y pgloader
echo "load database
  from sqlite:///var/www/django_websites/QuizOnline/quizonline-server/db.sqlite3
  into postgresql://quizonline:$PG_PASSWORD@localhost/quizonline
  with include drop, create tables, create indexes, reset sequences
  set work_mem to '64MB', maintenance_work_mem to '512MB';" > /tmp/migrate.load

pgloader /tmp/migrate.load
```

`pgloader` resets sequences on its own — skip step 7c. Everything
else (smoke test / rollback / housekeeping) is unchanged.
