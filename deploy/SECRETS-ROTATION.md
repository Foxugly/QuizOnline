# Credentials rotation runbook

Operator-facing reference for QuizOnline. Each section describes one
secret: where it lives, the blast radius if it leaks, the exact steps
to rotate, and the post-rotation verification.

> **Convention.** All commands assume you are SSH-connected to the
> production EC2 box as a user with `sudo`. The Django app lives at
> `/var/www/django_websites/QuizOnline/` and runs as user `django`.

---

## At a glance

| # | Secret | Lives in | Restart needed (always prefixed with `env-fetch`) | Severity if leaked |
|---|--------|----------|---------------------------------------------------|--------------------|
| 1 | `SECRET_KEY` | SSM `/quizonline/prod/SECRET_KEY` | gunicorn | High — all sessions invalidated, signed URLs broken |
| 2 | `JWT_SIGNING_KEY` | SSM `/quizonline/prod/JWT_SIGNING_KEY` | gunicorn | High — all active JWTs invalidated, mass re-login |
| 3 | `DB_PASSWORD` (DB password segment) | SSM `/quizonline/prod/DB_PASSWORD` + postgres | gunicorn + celery + celery-beat | Critical — read/write of all app data |
| 4 | `EMAIL_HOST_PASSWORD` | SSM `/quizonline/prod/EMAIL_HOST_PASSWORD` + Office 365 | gunicorn + celery | Critical — phishing from your own domain |
| 5 | `GRAPH_CLIENT_SECRET` | SSM `/quizonline/prod/GRAPH_CLIENT_SECRET` + Azure AD | gunicorn + celery | Critical — same as #4 plus Graph API access |
| 6 | `DEEPL_AUTH_KEY` | SSM `/quizonline/prod/DEEPL_AUTH_KEY` + DeepL portal | gunicorn | Low — third-party translation quota burnt |
| 7 | `SENTRY_DSN` (backend) | SSM `/quizonline/prod/SENTRY_DSN` + Sentry/GlitchTip | gunicorn + celery + celery-beat | Low — spam to your ingest, quota burnt |
| 8 | `SENTRY_DSN` (frontend) | SSM `/quizonline-frontend/prod/SENTRY_DSN` + Sentry | `systemctl restart quizonline-frontend-runtime-fetch` | Low — same as #7 |
| 9 | Personal SSH key on EC2 | `~/.ssh/authorized_keys` on EC2 (operator's `.pem` / `.ppk` on laptop) | none | High — shell access to prod. **Historical: this key was previously also stored as the GH Secret `EC2_SSH_KEY`; see notes in section 9.** |
| 10 | AWS IAM `quizonline-deploy` (OIDC) | trust policy + repo `sub` claim | none | Medium — can trigger a deploy + write to S3, can't read SSM Parameter Store |

---

## How rotation works (since Option B / SSM Parameter Store)

Sections 1-7 all describe secrets that live in AWS SSM Parameter
Store at ``/quizonline/prod/<KEY>`` (region ``eu-west-1``). The
EC2 instance pulls the full set into the tmpfs file
``/run/quizonline/.env`` at every boot via
``quizonline-env-fetch.service``, which is a ``Requires=``
dependency of the three application services. The canonical
rotation pattern is:

```bash
# 1. Put the new value
aws ssm put-parameter --region eu-west-1 \
  --name /quizonline/prod/<KEY> \
  --value "<new-value>" \
  --type SecureString --overwrite

# 2. Restart env-fetch AND whichever services consume that secret —
#    both in one call, systemd resolves the dep order.
sudo systemctl restart quizonline-env-fetch quizonline-gunicorn
# (add quizonline-celery quizonline-celery-beat for secrets read by
# the worker / beat: DB_*, EMAIL_*, GRAPH_*, SENTRY_DSN)
```

> **Important.** ``quizonline-env-fetch.service`` is a oneshot with
> ``RemainAfterExit=yes`` — once it has run successfully at boot it
> stays "active (exited)". A bare ``systemctl restart
> quizonline-gunicorn`` finds env-fetch already active, considers
> the ``Requires=`` dep satisfied, and **does not re-run** the
> fetch. gunicorn would then boot with the OLD value from the
> tmpfs. The explicit ``restart quizonline-env-fetch …`` forces
> systemd to re-execute the script, write the fresh value into
> ``/run/quizonline/.env``, and only then start gunicorn.

No SSH editor session, no perms-drift to worry about (the fetch
script writes ``0640 django:www-data`` deterministically), and
each rotation is logged in CloudTrail (`EventName =
PutParameter`). Below, only the **provider-side** preparation
(generate a new value, rotate at Office 365 / Azure AD / DeepL …)
is spelled out per secret — the SSM + restart half is identical.

---

## 1. `SECRET_KEY`

**What breaks if leaked.** Django uses it to sign session cookies,
password-reset tokens, the legacy `signing` framework, and several
internal CSRF helpers. Anyone with the value can forge sessions and
password-reset URLs.

**Prepare a new value.**

```bash
python3 -c 'import secrets; print(secrets.token_urlsafe(64))'
```

Then apply via the pattern above on `/quizonline/prod/SECRET_KEY`
and restart `quizonline-env-fetch quizonline-gunicorn` only —
celery doesn't read it for crypto, just for settings import. (See
the "Important" note in the preamble — env-fetch MUST be in the
restart command for the new value to land in /run/quizonline/.env.)

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

**Prepare a new value.**

```bash
python3 -c 'import secrets; print(secrets.token_urlsafe(64))'
```

Apply via the pattern on `/quizonline/prod/JWT_SIGNING_KEY` and
restart `quizonline-env-fetch quizonline-gunicorn`.

**Verify.** A logged-in browser will get 401 on the next API call and
be redirected to login. That's the expected post-rotation behaviour.

**Side effects.** Every authenticated user must re-login. Refresh
tokens also break — full re-authentication required.

---

## 3. `DB_PASSWORD` (DB password segment)

**What breaks if leaked.** Direct DB connection from anywhere the host
is reachable. Prod uses the fleet **DB_\* 6-var** convention
(`DB_ENGINE`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`/`DB_HOST`/`DB_PORT`,
OPERATIONS.md §3.13) on the box-local PostgreSQL — only the password
segment rotates; the other five are stable config.

**Provider-side prep.**

```bash
NEW_PW=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')
echo "$NEW_PW"   # copy
sudo -u postgres psql -c "ALTER USER quizonline WITH PASSWORD '$NEW_PW';"
```

Then put the new password on `/quizonline/prod/DB_PASSWORD`
(SecureString) and restart env-fetch + **all three** app services
(each holds its own DB pool):

```bash
sudo systemctl restart quizonline-env-fetch quizonline-gunicorn quizonline-celery quizonline-celery-beat
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

**Provider-side prep (Office 365).**

```text
1. Office 365 admin → Users → active users → select the SMTP mailbox
2. Reset password (set a generated value, copy it)
```

Then apply via the pattern on `/quizonline/prod/EMAIL_HOST_PASSWORD`
and restart `quizonline-env-fetch quizonline-gunicorn quizonline-celery`
(the worker sends queued mail).

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

## 5. `GRAPH_CLIENT_SECRET`

**What breaks if leaked.** Attacker can call Microsoft Graph as your
app — read/send mail, list users, plus any other Graph permission you
granted the app.

**Provider-side prep (Azure AD).**

```text
1. Azure portal → App registrations → QuizOnline → Certificates & secrets
2. New client secret (24-month expiry, descriptive name)
3. Copy the Value (NOT the Secret ID — that's the public reference)
4. Delete the old secret entry once the new one is verified
```

Then apply via the pattern on `/quizonline/prod/GRAPH_CLIENT_SECRET`
and restart `quizonline-env-fetch quizonline-gunicorn quizonline-celery`.

**Verify.** Same `sendtestemail` as section 4 if you use Graph for
outbound mail; otherwise hit whichever Graph-backed endpoint your
deployment uses.

**Side effects.** None beyond the gunicorn restart blip.

---

## 6. `DEEPL_AUTH_KEY`

**What breaks if leaked.** Attacker uses your DeepL quota for free
translations. With the free tier the cost is zero; with the Pro tier
they can rack up your bill.

**Provider-side prep.**

```text
1. DeepL portal → Account → Authentication Key → Regenerate
2. Copy the new key
```

Then apply via the pattern on `/quizonline/prod/DEEPL_AUTH_KEY` and
restart `quizonline-env-fetch quizonline-gunicorn` (DeepL is called
from the request path, not from celery).

**Verify.** Edit a question → press the "Translate" button in the SPA
→ check the target-language tab populates.

---

## 7. `SENTRY_DSN` (backend)

**What breaks if leaked.** Attacker can flood your ingest endpoint
with garbage events, exhausting your monthly quota and burying real
errors.

**Provider-side prep.**

```text
1. Sentry/GlitchTip → Project Settings → Client Keys (DSN)
2. Create new DSN, copy
3. Disable / delete the old DSN once the new one is verified live
```

Then apply via the pattern on `/quizonline/prod/SENTRY_DSN` and
restart `quizonline-env-fetch quizonline-gunicorn quizonline-celery quizonline-celery-beat`
(all three app units send events).

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

**Rotation.** The frontend runtime config lives in its own SSM prefix
`/quizonline-frontend/prod/*` with **bare names** (like
pushit-frontend / tm-frontend, OPERATIONS.md §3.14): `SENTRY_DSN`,
`SENTRY_ENV`, `SENTRY_RELEASE`, `TURNSTILE_SITE_KEY` — all `String`
(public, shipped in the SPA). The nginx snippet is auto-generated at
boot and after every CI deploy by
`quizonline-frontend-runtime-fetch.service`.

```bash
# 1. Update SSM (from your laptop or any box with the right IAM)
aws ssm put-parameter --overwrite \
  --region eu-west-1 \
  --name /quizonline-frontend/prod/SENTRY_DSN \
  --type String \
  --value 'https://NEW_DSN@oXXXX.ingest.de.sentry.io/YYYY'

# 2. Trigger the fetch on the box (via SSM Session Manager)
sudo systemctl restart quizonline-frontend-runtime-fetch.service

# (alternatively, the next CI deploy will pick it up automatically)
```

The service rewrites `/etc/nginx/snippets/quizonline-frontend-runtime.conf`
from the current SSM values, runs `nginx -t` as a guard, then
`systemctl reload nginx`. Idempotent — if the snippet is unchanged
(same DSN), no reload happens.

**Verify.**

```bash
curl -s https://quizonline.foxugly.com/ | grep -o '__QUIZONLINE_SENTRY_DSN="[^"]*"'
# expect the new DSN value

sudo journalctl -u quizonline-frontend-runtime-fetch.service -n 20
# expect: "$OUT_FILE updated" + "nginx reloaded"
```

Trigger a `console.error` in the SPA (any wrong-credentials login
attempt does it) and check it lands in Sentry.

The sibling parameters `SENTRY_ENV`, `SENTRY_RELEASE` and
`TURNSTILE_SITE_KEY` (all under `/quizonline-frontend/prod`) rotate
the same way — same SSM `put-parameter`, same `systemctl restart`.

---

## 9. Personal SSH key on EC2

**Current state.** The `~/.ssh/authorized_keys` of the `ubuntu` user
holds one ssh-rsa pubkey. The matching private key (`.pem` / `.ppk`)
lives on the operator's laptop only. The GitHub Actions secret
`EC2_SSH_KEY` was removed during the OIDC migration (May 2026), so
this key no longer grants any automated access — only personal.

**What breaks if leaked.** Shell access to prod as the `ubuntu`
user (which has passwordless sudo to `django`). Assume `.env` is
leaked too and rotate the lot.

**Historical note — outstanding hygiene item.** This pubkey was
historically shared between the operator and the old SSH-based
deploy workflow. Until rotated, the private key that was once stored
in `EC2_SSH_KEY` remains a theoretical compromise vector (any
historical exfiltration via a malicious workflow run would still be
usable today). Probability is low (would have left CI log traces),
but the clean fix is to rotate the key when convenient:

```bash
# Local: generate a fresh, operator-only keypair
ssh-keygen -t ed25519 -C "renaud@laptop" -f ~/.ssh/qol_personal -N ""

# On EC2: append the new pubkey, do NOT delete the old one yet
echo "<paste new pubkey>" | sudo tee -a /home/ubuntu/.ssh/authorized_keys

# Verify the new key works (separate SSH session) BEFORE removing the old
ssh -i ~/.ssh/qol_personal ubuntu@<EC2_IP> 'echo ok'

# Once the new key is confirmed, drop the old line
sudo $EDITOR /home/ubuntu/.ssh/authorized_keys

# Re-verify
ssh -i ~/.ssh/qol_personal ubuntu@<EC2_IP> 'echo ok'
```

**Verify.** A second SSH session with the new key MUST succeed
*before* you remove the old key — otherwise a typo in the new
pubkey locks you out and you fall back to SSM Session Manager
(`aws ssm start-session --target <instance-id>` — see
[`README.md`](README.md)) to recover.

**Alternative.** Removing SSH entirely and relying only on AWS SSM
Session Manager closes this surface for good. Requires nothing
beyond what's already deployed.

---

## 10. AWS IAM role `quizonline-deploy` (OIDC)

**What breaks if compromised.** GitHub Actions can `s3:PutObject` on
`foxugly-deploy/builds/quizonline/*` and `ssm:SendCommand` on the EC2
instance. The attacker can trigger a deploy of arbitrary frontend
content (if they also push a malicious commit to main, or upload a
tampered bundle and call SendCommand to install it). They cannot
SSH in, cannot read `.env`, and cannot exfiltrate data beyond what
the existing `ssm-deploy.sh` does.

**Rotation = tighten the trust policy condition.**

```text
1. AWS console → IAM → Roles → quizonline-deploy → Trust relationships
2. The Condition.StringEquals block should read:
     token.actions.githubusercontent.com:aud = "sts.amazonaws.com"
     token.actions.githubusercontent.com:sub = "repo:Foxugly/QuizOnline:environment:production"
3. If the repo is forked / migrated / renamed, update the sub claim
   accordingly (org and repo names are case-sensitive).
4. If you suspect compromise: detach the inline DeployViaSSM policy
   to immediately break the role's effective permissions, investigate
   via CloudTrail (Service = sts.amazonaws.com, EventName =
   AssumeRoleWithWebIdentity for the role), then re-attach. Existing
   tokens have a 15-minute TTL so the window of exposure is bounded.
```

**Verify.** Trigger a manual deploy:
``gh workflow run Deploy --repo Foxugly/QuizOnline``. Watch for the
"Configure AWS credentials (OIDC)" step succeeding.

No app restart needed — the role is consulted on every Actions run.

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

## Runtime .env integrity (`/run/quizonline/.env`)

`quizonline-env-fetch.service` writes the runtime env file with
deterministic perms (`0640 django:www-data`) on every boot —
permissions cannot drift in practice. If you ever need to inspect:

```bash
sudo stat -c '%a %U:%G %n' /run/quizonline/.env
# expect: 640 django:www-data /run/quizonline/.env

# Re-trigger the fetch without rebooting:
sudo systemctl restart quizonline-env-fetch.service quizonline-gunicorn
```

If the fetch service fails (CloudTrail will show the failed
`GetParametersByPath`), the **previous** tmpfs file is preserved
intact (the script bails before the atomic rename) and gunicorn keeps
running on the last-known-good config. Investigate via
`sudo journalctl -u quizonline-env-fetch -n 50`.
