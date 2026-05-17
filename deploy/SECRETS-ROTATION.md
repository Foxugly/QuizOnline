# Credentials rotation runbook

Operator-facing reference for QuizOnline. Each section describes one
secret: where it lives, the blast radius if it leaks, the exact steps
to rotate, and the post-rotation verification.

> **Convention.** All commands assume you are SSH-connected to the
> production EC2 box as a user with `sudo`. The Django app lives at
> `/var/www/django_websites/QuizOnline/` and runs as user `django`.

---

## At a glance

| # | Secret | Lives in | Restart needed | Severity if leaked |
|---|--------|----------|----------------|--------------------|
| 1 | `SECRET_KEY` | `.env` | gunicorn | High — all sessions invalidated, signed URLs broken |
| 2 | `JWT_SIGNING_KEY` | `.env` | gunicorn | High — all active JWTs invalidated, mass re-login |
| 3 | `DATABASE_URL` (password segment) | `.env` + postgres | gunicorn + celery | Critical — read/write of all app data |
| 4 | `EMAIL_HOST_PASSWORD` | `.env` + Office 365 | gunicorn | Critical — phishing from your own domain |
| 5 | `MS_GRAPH_CLIENT_SECRET` | `.env` + Azure AD | gunicorn | Critical — same as #4 plus Graph API access |
| 6 | `DEEPL_AUTH_KEY` | `.env` + DeepL portal | gunicorn | Low — third-party translation quota burnt |
| 7 | `SENTRY_DSN` (backend) | `.env` + Sentry/GlitchTip | gunicorn | Low — spam to your ingest, quota burnt |
| 8 | `SENTRY_DSN` (frontend) | `/etc/nginx/snippets/quizonline-frontend-runtime.conf` + Sentry | nginx reload | Low — same as #7 |
| 9 | `EC2_SSH_KEY` (GitHub Secret) | GH repo secrets + EC2 `authorized_keys` | none | Critical — shell access to prod |
| 10 | AWS IAM `quizonline-deploy` (post-OIDC) | trust policy + repo `sub` claim | none | Medium — can trigger a deploy, can't read `.env` |

---

## 1. `SECRET_KEY`

**What breaks if leaked.** Django uses it to sign session cookies,
password-reset tokens, the legacy `signing` framework, and several
internal CSRF helpers. Anyone with the value can forge sessions and
password-reset URLs.

**Rotation.**

```bash
# Generate
python -c 'import secrets; print(secrets.token_urlsafe(64))'

# Update .env on EC2
sudo -u django $EDITOR /var/www/django_websites/QuizOnline/quizonline-server/.env
# → replace SECRET_KEY=...

# Restart only the Django process — celery doesn't read SECRET_KEY for
# crypto, just for general settings import.
sudo systemctl restart quizonline-gunicorn
```

**Verify.**

```bash
sudo journalctl -u quizonline-gunicorn -n 20 --no-pager | grep -i "ready\|listening"
curl -s -o /dev/null -w "%{http_code}\n" https://quizonline.foxugly.com/api/schema/
# expect 200
```

**Side effects.** All users get logged out at next request. Pending
password-reset emails sent before rotation become invalid.

---

## 2. `JWT_SIGNING_KEY`

**What breaks if leaked.** All issued JWT access + refresh tokens
become forgeable. An attacker can mint a token for any user id.

**Rotation.**

```bash
python -c 'import secrets; print(secrets.token_urlsafe(64))'
sudo -u django $EDITOR /var/www/django_websites/QuizOnline/quizonline-server/.env
# → replace JWT_SIGNING_KEY=...
sudo systemctl restart quizonline-gunicorn
```

**Verify.** A logged-in browser will get 401 on the next API call and
be redirected to login. That's the expected post-rotation behaviour.

**Side effects.** Every authenticated user must re-login. Refresh
tokens also break — full re-authentication required.

---

## 3. `DATABASE_URL` (password segment)

**What breaks if leaked.** Direct DB connection from anywhere the host
is reachable. With SQLite the URL holds only a path (no rotation
needed); the steps below assume Postgres.

**Rotation.**

```bash
# 1. Generate
NEW_PW=$(python -c 'import secrets; print(secrets.token_urlsafe(32))')
echo "$NEW_PW"   # copy

# 2. Update postgres
sudo -u postgres psql -c "ALTER USER quizonline WITH PASSWORD '$NEW_PW';"

# 3. Update .env (preserve URL shape: postgres://user:NEW_PW@host:port/db)
sudo -u django $EDITOR /var/www/django_websites/QuizOnline/quizonline-server/.env

# 4. Restart everything that holds a DB connection pool
sudo systemctl restart quizonline-gunicorn quizonline-celery quizonline-celery-beat
```

**Verify.**

```bash
sudo -u django bash -c '
  cd /var/www/django_websites/QuizOnline/quizonline-server
  .venv/bin/python manage.py shell -c "from django.db import connection; connection.ensure_connection(); print(\"DB OK\")"
'
```

**Side effects.** ~5 seconds of 502 while gunicorn restarts.

---

## 4. `EMAIL_HOST_PASSWORD`

**What breaks if leaked.** Attacker authenticates against SMTP and
sends mail from `DEFAULT_FROM_EMAIL` — phishing under your domain's
trust.

**Rotation (Office 365).**

```text
1. Office 365 admin → Users → active users → select the SMTP mailbox
2. Reset password (set a generated value, copy it)
3. Update .env, restart gunicorn:
```

```bash
sudo -u django $EDITOR /var/www/django_websites/QuizOnline/quizonline-server/.env
# → replace EMAIL_HOST_PASSWORD=...
sudo systemctl restart quizonline-gunicorn
```

**Verify.**

```bash
sudo -u django bash -c '
  cd /var/www/django_websites/QuizOnline/quizonline-server
  .venv/bin/python manage.py sendtestemail your@email.com
'
# expect arrival in your inbox within a minute
```

**Side effects.** Outbound mail blocked for the few seconds while
gunicorn restarts. Queued Celery email tasks retry automatically.

---

## 5. `MS_GRAPH_CLIENT_SECRET`

**What breaks if leaked.** Attacker can call Microsoft Graph as your
app — read/send mail, list users, plus any other Graph permission you
granted the app.

**Rotation (Azure AD).**

```text
1. Azure portal → App registrations → QuizOnline → Certificates & secrets
2. New client secret (24-month expiry, descriptive name)
3. Copy the Value (NOT the Secret ID — that's the public reference)
4. Delete the old secret entry once #3-#5 below are done
```

```bash
sudo -u django $EDITOR /var/www/django_websites/QuizOnline/quizonline-server/.env
# → replace MS_GRAPH_CLIENT_SECRET=...
sudo systemctl restart quizonline-gunicorn
```

**Verify.** Same `sendtestemail` as section 4 if you use Graph for
outbound mail; otherwise hit whichever Graph-backed endpoint your
deployment uses.

**Side effects.** None beyond the gunicorn restart blip.

---

## 6. `DEEPL_AUTH_KEY`

**What breaks if leaked.** Attacker uses your DeepL quota for free
translations. With the free tier the cost is zero; with the Pro tier
they can rack up your bill.

**Rotation.**

```text
1. DeepL portal → Account → Authentication Key → Regenerate
2. Copy the new key
```

```bash
sudo -u django $EDITOR /var/www/django_websites/QuizOnline/quizonline-server/.env
# → replace DEEPL_AUTH_KEY=...
sudo systemctl restart quizonline-gunicorn
```

**Verify.** Edit a question → press the "Translate" button in the SPA
→ check the target-language tab populates.

---

## 7. `SENTRY_DSN` (backend)

**What breaks if leaked.** Attacker can flood your ingest endpoint
with garbage events, exhausting your monthly quota and burying real
errors.

**Rotation.**

```text
1. Sentry/GlitchTip → Project Settings → Client Keys (DSN)
2. Create new DSN, copy
3. Disable / delete the old DSN
```

```bash
sudo -u django $EDITOR /var/www/django_websites/QuizOnline/quizonline-server/.env
# → replace SENTRY_DSN=...
sudo systemctl restart quizonline-gunicorn
```

**Verify.**

```bash
# Trigger a known error and watch it land in Sentry within a minute.
sudo -u django bash -c '
  cd /var/www/django_websites/QuizOnline/quizonline-server
  .venv/bin/python manage.py shell -c "from sentry_sdk import capture_message; capture_message(\"rotation test\")"
'
```

---

## 8. `SENTRY_DSN` (frontend)

**What breaks if leaked.** Same as #7 but the DSN is already in every
page's HTML, so it's not really a "secret" — leaking it widens the
quota-abuse surface without exposing new data.

**Rotation.**

```bash
sudo $EDITOR /etc/nginx/snippets/quizonline-frontend-runtime.conf
# → update set $sentry_dsn "...";
sudo nginx -t && sudo systemctl reload nginx
```

**Verify.**

```bash
curl -s https://quizonline.foxugly.com/ | grep -o '__QUIZONLINE_SENTRY_DSN="[^"]*"'
# expect the new DSN value
```

Trigger a `console.error` in the SPA (any wrong-credentials login
attempt does it) and check it lands in Sentry.

---

## 9. `EC2_SSH_KEY` (GitHub Actions secret)

**What breaks if leaked.** Shell access to prod as the deploy user.
Game over — assume `.env` is leaked too and rotate the lot.

**Rotation.**

```bash
# Local: generate a fresh keypair
ssh-keygen -t ed25519 -C "github-actions-quizonline" -f ~/.ssh/qol_deploy -N ""

# On EC2: install the new public key, remove the old one
sudo $EDITOR /home/ubuntu/.ssh/authorized_keys
# → paste new pubkey, delete old line

# GitHub repo: Settings → Secrets and variables → Actions → EC2_SSH_KEY
# → "Update" with contents of ~/.ssh/qol_deploy (the *private* key)
```

**Verify.** Trigger a manual deploy via "Run workflow" in the Actions
tab and watch it succeed.

> **Note.** Once Tier 2 (OIDC) is in place this entire secret goes
> away. The new threat is the IAM role's trust policy — see #10.

---

## 10. AWS IAM role `quizonline-deploy` (post-OIDC)

**What breaks if compromised.** GitHub Actions can `ssm:SendCommand`
on the EC2 instance. The attacker can trigger a deploy of arbitrary
content (so they can poison the frontend bundle if they also control
the S3 bucket), but they cannot SSH in and cannot `cat .env`.

**Rotation = tighten the trust policy.**

```text
1. AWS console → IAM → Roles → quizonline-deploy → Trust relationships
2. Confirm the Condition still scopes to:
     token.actions.githubusercontent.com:sub = "repo:Foxugly/QuizOnline:ref:refs/heads/main"
3. If the repo was forked or migrated, update the sub claim
4. If you suspect compromise: detach the policy, then re-attach with
   the same trust + a NotBefore condition that excludes the suspect
   window. Old tokens become unusable immediately.
```

No app restart needed — the role is consulted at each Actions run.

---

## Underlying storage (one-shot verification)

Encrypted EBS protects the at-rest secrets when snapshots get copied,
attached elsewhere or shared. AWS encrypts new volumes by default
since 2017 but **older instances may pre-date this** — verify once:

```bash
aws ec2 describe-volumes \
  --region eu-west-1 \
  --filters "Name=attachment.instance-id,Values=$EC2_INSTANCE_ID" \
  --query 'Volumes[*].[VolumeId,Encrypted,KmsKeyId]' --output table
```

If `Encrypted=false` for the root volume:
1. Stop the instance.
2. Snapshot the volume; copy the snapshot with `--encrypted`.
3. Create a new volume from the encrypted snapshot, attach as root,
   detach the old one.
4. Start the instance, verify `.env` and the app work.
5. Delete the old unencrypted volume + snapshot.

---

## .env file integrity

The `redeploy.sh` pre-flight blocks any deploy when `.env` is not
`600 django:www-data`. If a deploy fails with that error:

```bash
sudo chmod 600 /var/www/django_websites/QuizOnline/quizonline-server/.env
sudo chown django:www-data /var/www/django_websites/QuizOnline/quizonline-server/.env
```

Investigate **why** the perms drifted before re-running — a chmod
loosening is almost always a deploy-script or backup-restore bug, not
random rot.
