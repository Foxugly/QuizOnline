# Deployment

Operator runbook for the QuizOnline production environment. Companion
to [`SECRETS-ROTATION.md`](SECRETS-ROTATION.md) (one section per
credential), [`env.production.example`](env.production.example)
(reference shape of the backend `.env`), and
[`COURSE-INVITE-RUNBOOK.md`](COURSE-INVITE-RUNBOOK.md) (rollback /
monitoring / failure modes specific to the LMS course-invite flow).

The day-to-day flow is **"push to `main`, watch CI go green, deploy
fires automatically"** — everything below this paragraph is for the
once-in-a-while cases: a deploy fails, the box needs to be bootstrapped
from scratch, a hotfix has to skip CI, a build has to roll back.

---

## Topology

```
┌───────────────┐   git push          ┌──────────────────┐
│  Local laptop │ ──────────────────► │  GitHub repo     │
└───────────────┘                     │  Foxugly/        │
                                      │  QuizOnline      │
                                      └────────┬─────────┘
                                               │ workflow_run (CI green)
                                      ┌────────▼─────────┐
                                      │  GitHub Actions  │
                                      │   • build Angular│
                                      │   • OIDC → AWS   │
                                      │   • S3 upload    │
                                      │   • SSM RunCmd   │
                                      └────────┬─────────┘
                                               │ assumes role
                                      ┌────────▼─────────┐
                                      │  AWS eu-west-1   │
                                      │  • role          │
                                      │    quizonline-   │
                                      │    deploy        │
                                      │  • bucket        │
                                      │    quizonline-   │
                                      │    deploy/builds │
                                      └────────┬─────────┘
                                               │ ssm:SendCommand
                                      ┌────────▼─────────┐
                                      │  EC2 instance    │
                                      │  • SSM agent     │
                                      │  • env-fetch ◄───┼── SSM Parameter
                                      │    (boot oneshot)│   Store /quizonline/
                                      │  • /run/         │   prod/* (SecureString)
                                      │    quizonline/   │
                                      │    .env (tmpfs)  │
                                      │  • django user   │
                                      │  • nginx (443)   │
                                      │  • gunicorn:8000 │
                                      │  • celery worker │
                                      │  • celery beat   │
                                      └──────────────────┘
```

Repository layout on EC2:

```
/var/www/django_websites/QuizOnline/        ← git checkout
├── quizonline-server/                       ← Django app
│   └── .venv/                               ← Python venv
├── quizonline-frontend/
│   └── dist/quizonline-frontend/
│       ├── browser/                         ← live bundle (served by nginx)
│       └── browser.prev/                    ← previous bundle (rollback target)
└── deploy/                                  ← this directory

/run/quizonline/                             ← tmpfs (per-boot)
└── .env                                     ← 640 django:www-data, written
                                                at boot by env-fetch from
                                                SSM /quizonline/prod/*
```

The env-fetch service's `ExecStart=` points straight at
`deploy/fetch-env-from-ssm.sh` in the git checkout — no copy into
`/usr/local/bin/`, which would need sudoers rules the django user
doesn't have.

---

## Day-to-day deploy

```bash
git push origin main
```

What happens:

1. **CI** workflow runs on the GitHub runner (~3 min): lint, type-check,
   i18n completeness, backend pytest, frontend Vitest, prod build, e2e.
2. On CI green, **Deploy** workflow fires (~2 min):
   - rebuilds the Angular bundle on the runner (EC2 is memory-limited),
   - assumes the `quizonline-deploy` AWS role via OIDC,
   - uploads the SHA-tagged tarball to S3,
   - fires `aws ssm send-command` against the EC2 instance,
   - polls until terminal state.
3. EC2 receives the SSM command. The sequence on the box is:
   - `git fetch && git reset --hard origin/main`,
   - `bash deploy/ssm-deploy.sh <SHA> <BUCKET>` which itself:
     - runs `redeploy.sh --skip-frontend` (backend deps, migrate,
       collectstatic, gunicorn + celery restart, health checks),
     - downloads the bundle from S3 to a tempfile,
     - extracts to a staging dir,
     - atomically swaps `browser/` ← staging, keeps the old one as
       `browser.prev/` (one-step rollback),
     - reloads nginx.

Watch the run:

```bash
gh run watch --repo Foxugly/QuizOnline
```

---

## Manual deploy (workflow_dispatch)

When you want to redeploy without pushing a new commit — e.g. you
just edited the nginx Sentry snippet on EC2 and need to reload, or
CI passed yesterday and you want to re-roll the same SHA:

```bash
gh workflow run Deploy --repo Foxugly/QuizOnline --ref main
```

Or via the GitHub UI: Actions → Deploy → *Run workflow* → main.

The whole pipeline runs the same way as the auto-trigger; the only
difference is `github.event_name == 'workflow_dispatch'`. The build
step rebuilds at HEAD of main even if you wanted an older SHA — see
"Rollback" below for that case.

---

## Rollback

Three levels, from cheapest to nuclear:

### Level 1 — restore the previous frontend bundle (5 seconds)

If the latest deploy shipped a broken Angular bundle but the backend
is fine. `ssm-deploy.sh` always preserves the previous bundle under
`browser.prev/`:

```bash
# SSH on EC2 (or use SSM Session Manager — see below)
sudo -u django bash -c '
  cd /var/www/django_websites/QuizOnline/quizonline-frontend/dist/quizonline-frontend
  rm -rf browser
  mv browser.prev browser
'
sudo systemctl reload nginx
```

The window is one deploy — the next successful deploy overwrites
`browser.prev/` with the previous live version, so don't dawdle.

### Level 2 — git revert + push (one full cycle)

If the bad change includes backend code:

```bash
# Local
git revert <bad-sha>
git push origin main
```

The CI + Deploy pipeline rolls forward to a commit that undoes the
breakage. ~5 minutes end to end. The Level 1 rollback bought you
that window if the frontend was the symptom.

### Level 3 — restore a specific historical bundle from S3

S3 keeps the SHA-tagged bundles for 14 days (lifecycle rule
`expire-old-builds`). To reinstate the bundle from commit `<SHA>`
without touching git:

```bash
# Local — pin the deploy script to a known SHA
gh workflow run Deploy --repo Foxugly/QuizOnline --ref <SHA>
```

`--ref <SHA>` tells GitHub to check out that SHA before running the
workflow. The build step rebuilds the bundle from that SHA's
sources; SSM then deploys the freshly-rebuilt tarball.

To restore an *exact bundle bit-for-bit* (e.g. when sources won't
build anymore for some reason), download manually:

```bash
# On EC2 — fetch a historical bundle and swap it in
SHA=<sha-from-s3-or-git>
sudo -u django aws s3 cp s3://quizonline-deploy/builds/$SHA.tar.gz /tmp/build.tar.gz
sudo -u django bash -c '
  cd /var/www/django_websites/QuizOnline/quizonline-frontend/dist/quizonline-frontend
  rm -rf browser.staging
  mkdir browser.staging && tar -xzf /tmp/build.tar.gz -C browser.staging
  rm -rf browser.prev
  mv browser browser.prev
  mv browser.staging browser
'
sudo systemctl reload nginx
```

---

## Upgrade the Python runtime

EOL bumps (e.g. 3.8 → 3.12) — `deploy/upgrade-python.sh` does the
swap in-place on the live box. Stops the three services, backs the
old venv up to `.venv.bak.<timestamp>`, creates a fresh venv with
the target interpreter, reinstalls `requirements.txt`, runs
`manage.py check` + `migrate --plan` as a guard, then restarts and
polls `/health/`. A `trap` triggers automatic rollback on any
failure between stop and start.

```bash
# On EC2, as a sudoer:
sudo bash deploy/upgrade-python.sh --dry-run        # preview, no mutations
sudo bash deploy/upgrade-python.sh                  # interactive, target 3.12
sudo bash deploy/upgrade-python.sh --version 3.13   # any minor version
sudo bash deploy/upgrade-python.sh --yes            # skip the confirm prompt
sudo bash deploy/upgrade-python.sh --rollback       # restore the most recent .venv.bak.*
```

Idempotent: re-running on a box already on the target version is a
no-op. The backup is kept indefinitely — delete it manually after a
week of uptime on the new interpreter:

```bash
sudo rm -rf /var/www/django_websites/QuizOnline/quizonline-server/.venv.bak.<timestamp>
```

When you bump prod, **also bump CI** (`.github/workflows/ci.yml`,
the five `setup-python` blocks) so the runner matches the prod
interpreter and a future PEP-585-style runtime gotcha (`list[int]`
crashes on 3.8 but compiles cleanly everywhere else) cannot slip
through.

---

## AWS resources

All in **eu-west-1** unless noted.

| Resource | Name / ARN | Purpose |
|----------|------------|---------|
| OIDC provider | `arn:aws:iam::<ACCOUNT>:oidc-provider/token.actions.githubusercontent.com` | Lets GitHub Actions mint short-lived AWS tokens (audience `sts.amazonaws.com`). Global, one per account. |
| IAM role | `quizonline-deploy` | Assumed by GitHub Actions via OIDC. Trust policy scoped to `repo:Foxugly/QuizOnline:environment:production`. Inline policy `DeployViaSSM` grants `s3:PutObject` on `builds/*`, `ssm:SendCommand` on the EC2 instance + AWS-RunShellScript document, and `ssm:GetCommandInvocation` (resource `*` because command-id is dynamic). |
| IAM role | `quizonline-ec2` | EC2 instance role. Managed policies `AmazonSSMManagedInstanceCore` (+ `CloudWatchAgentServerPolicy`, dormant). Inline `S3ReadDeployBundles` grants `s3:GetObject` on `arn:aws:s3:::quizonline-deploy/builds/*` (SSM-invoked deploy scripts pull bundles). Inline `ReadAppConfigFromSSM` grants `ssm:GetParameter[s][ByPath]` on `arn:aws:ssm:eu-west-1:<ACCOUNT>:parameter/quizonline/prod[/*]` (boot-time env fetch). KMS decrypt on `alias/aws/ssm` is implicit when reading SecureString with the default key. |
| S3 bucket | `quizonline-deploy` | Private, versioning on. Lifecycle `expire-old-builds`: current versions 14d, noncurrent 7d, incomplete multipart 7d. Bundles named `builds/<sha>.tar.gz`. |
| SSM Parameter Store | `/quizonline/prod/*` | Backend env vars (`SECRET_KEY`, `JWT_SIGNING_KEY`, `DATABASE_URL`, `EMAIL_*`, `MS_GRAPH_*`, `DEEPL_AUTH_KEY`, `SENTRY_*`, `ALLOWED_HOSTS`, `THROTTLE_*`, …). SecureString for actual secrets (KMS-encrypted with `aws/ssm`), String for plain config. Standard tier — no cost. Rotation = `aws ssm put-parameter --overwrite` + `sudo systemctl restart quizonline-env-fetch <app-unit>` (see [`SECRETS-ROTATION.md`](SECRETS-ROTATION.md)). |
| EC2 instance | (see AWS console — region eu-west-1) | t-class or larger. Ubuntu 24.04 LTS. SSM agent via snap, AWS CLI v2 from official installer. |

---

## Secrets at runtime (Option B — SSM Parameter Store)

All backend env vars (real secrets and plain config alike) live in
SSM Parameter Store at `/quizonline/prod/*`. There is no persistent
`.env` on disk:

1. At boot, `quizonline-env-fetch.service` (oneshot, before the app
   services) invokes
   `/var/www/django_websites/QuizOnline/deploy/fetch-env-from-ssm.sh`
   straight from the git checkout, which calls
   `aws ssm get-parameters-by-path --recursive --with-decryption`
   and writes the result to `/run/quizonline/.env` (tmpfs, mode
   `640 django:www-data`).
2. gunicorn / celery / celery-beat declare `Requires=quizonline-env-fetch.service`
   and `EnvironmentFile=/run/quizonline/.env`. The `Requires=` makes
   env-fetch a startup *dependency* but **does not re-run** it on a
   bare service restart (env-fetch is oneshot + RemainAfterExit=yes,
   systemd sees it already active and skips it).
3. Rotation = `aws ssm put-parameter --overwrite --name … --value …`
   followed by an *explicit* restart of env-fetch alongside the app
   service(s): `sudo systemctl restart quizonline-env-fetch quizonline-gunicorn`
   (add celery / celery-beat for secrets they consume — see the
   per-secret restart column in [`SECRETS-ROTATION.md`](SECRETS-ROTATION.md)).

The data flow, end to end:

```
[laptop] prod.env ──seed-parameter-store.sh──► SSM /quizonline/prod/*  (SecureString / String)
                                                      │
                      at boot, or `systemctl restart quizonline-env-fetch`
                                                      │  get-parameters-by-path --recursive --with-decryption
                                                      │  (auth: EC2 instance role quizonline-ec2 via IMDS — no keys on disk)
                                                      ▼
                                         /run/quizonline/.env   (tmpfs, atomic write, 640 django:www-data)
                                                      │  EnvironmentFile=
                                                      ▼
                                 gunicorn  ·  celery  ·  celery-beat
```

> **A normal deploy does NOT re-fetch env.** `redeploy.sh` (and the
> `git push` → CI → SSM pipeline it runs under) restart only
> `quizonline-gunicorn` / `celery` / `celery-beat`, never
> `quizonline-env-fetch`. Because env-fetch is `Type=oneshot` +
> `RemainAfterExit=yes` it stays "active" after the first boot, so its
> `Requires=` edge is already satisfied and a plain restart reuses the
> existing `/run/quizonline/.env`. **Any change to an SSM parameter
> therefore only takes effect after the explicit
> `systemctl restart quizonline-env-fetch` in step 3 above** (or a
> full reboot, which re-runs the oneshot).

Properties this gives us:

- **No plaintext secret on EBS.** Snapshots, backups and full-disk
  forensics never see `.env` content.
- **No perms drift.** The fetch script writes deterministic perms
  on every boot.
- **CloudTrail audit.** Every `PutParameter` / `GetParametersByPath`
  is logged with caller identity and source IP.
- **Multi-environment ready.** A future staging EC2 would scope its
  instance role to `/quizonline/staging/*` and read from there
  without touching prod.

If SSM is unreachable at boot the fetch service fails, gunicorn's
`Requires=` chain blocks its start, and the box doesn't silently
serve traffic with stale config — `systemctl status quizonline-gunicorn`
points straight at the env-fetch failure.

The local script that seeds SSM from a `.env` file is
[`seed-parameter-store.sh`](seed-parameter-store.sh) (idempotent,
`--dry-run` available, future staging via `--prefix`).

### LMS throttles

After deploying the LMS, seed the three rate-limit parameters into AWS SSM Parameter Store:

```bash
cat > /tmp/lms-throttles.env <<EOF
THROTTLE_LMS_ENROLL=20/min
THROTTLE_LMS_BLOCK_WRITE=120/min
THROTTLE_LMS_CERT_VERIFY=60/min
EOF
bash deploy/seed-parameter-store.sh --prefix /quizonline/prod /tmp/lms-throttles.env
rm /tmp/lms-throttles.env
sudo systemctl restart quizonline-env-fetch.service quizonline-gunicorn.service
```

The parameters are non-secret (operational tunables) — `String` type is sufficient, `SecureString` is overkill.

---

## GitHub Actions secrets

Repository-level secrets used by `.github/workflows/deploy.yml`. No
long-lived AWS access keys; OIDC handles auth dynamically.

| Secret | Value shape |
|--------|-------------|
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::<ACCOUNT>:role/quizonline-deploy` |
| `AWS_REGION` | `eu-west-1` |
| `EC2_INSTANCE_ID` | `i-XXXXXXXXXXXXXXXXX` |
| `S3_DEPLOY_BUCKET` | `quizonline-deploy` |

**Environment**: `production` (Settings → Environments). Used by the
`environment:` job attribute in `deploy.yml`, which (a) feeds the
`environment:production` part of the OIDC sub claim (matching the
role's trust policy condition) and (b) lets you add deployment
protection rules (required reviewers, wait timer, scheduled windows)
without changing app code.

---

## systemd services

Unit files in [`deploy/`](.), synced into `/etc/systemd/system/` by
`redeploy.sh` step 4 when they change.

| Unit | Role | EnvironmentFile |
|------|------|-----------------|
| `quizonline-env-fetch.service` | Boot-time oneshot: pull env vars from SSM Parameter Store into `/run/quizonline/.env`. Barrier for the three app units below. | none — runs `aws ssm` directly |
| `quizonline-gunicorn.service` | Django HTTP via gunicorn, binds 127.0.0.1:8000 | `/run/quizonline/.env` |
| `quizonline-celery.service` | Celery worker (email outbox, async tasks) | `/run/quizonline/.env` |
| `quizonline-celery-beat.service` | Celery beat scheduler | `/run/quizonline/.env` |
| `quizonline-backup.service` + `.timer` | Daily DB backup | inline `Environment=` |

The three app units declare `Requires=quizonline-env-fetch.service`
for boot ordering. Secret rotation is `aws ssm put-parameter
--overwrite` plus `systemctl restart quizonline-env-fetch <app>` —
env-fetch must be in the restart command (it's a oneshot with
`RemainAfterExit=yes`, so `Requires=` alone doesn't re-run it on a
bare app restart).

All app processes run as `User=django, Group=www-data`. Gunicorn-access
/ gunicorn-error logs live under `/var/log/quizonline/`. Celery and
env-fetch logs go to journald — `journalctl -u quizonline-celery`,
`journalctl -u quizonline-env-fetch`.

Reverse proxy is **nginx** (the `apache.conf` template is kept for
parity but unused on the live box). Live config lives at
`/etc/nginx/sites-available/quizonline.foxugly.com` (symlinked from
`sites-enabled/`), sourced from [`nginx.conf`](nginx.conf) in this
directory. Optional frontend runtime snippet at
`/etc/nginx/snippets/quizonline-frontend-runtime.conf` — see
[`quizonline-frontend-runtime.conf.example`](quizonline-frontend-runtime.conf.example).

---

## Uptime monitoring

External monitor: **UptimeRobot** (free tier, 5-min interval). Each
prod node should be pinged on:

```
https://quizonline.foxugly.com/health/
```

Not `/`. The root returns 200 on the SPA shell even when the DB or
Redis is dead — a stale uptime monitor would stay green while every
real request 500s. `/health/` is the enriched check defined in
[`config/views_health.py`](../quizonline-server/config/views_health.py):

| Probe | Source | Effect on HTTP status |
|-------|--------|-----------------------|
| `db` | `SELECT 1` on the default connection | flips to **503** on failure |
| `cache` | round-trip a probe key through Django cache (Redis) | flips to **503** on failure |
| `celery` | `Inspect.ping` with 1 s timeout | informational only — stays 200 (the web tier still serves) |
| `outbox_pending` | count of `OutboundEmail` rows not yet sent | counter only |

Payload shape:

```json
{
  "status": "ok" | "degraded",
  "version": "quizonline-1.1.0",
  "checks": {
    "db":     {"ok": true},
    "cache":  {"ok": true},
    "celery": {"ok": true}
  },
  "outbox_pending": 0
}
```

The `version` field is read from the `SENTRY_RELEASE` env var (so it
matches the tag stamped on Sentry events). Useful sanity check after
a deploy: `curl -s https://.../health/ | jq .version` should match
the freshly-pushed `package.json#version`. If it doesn't, env-fetch
didn't pick up the new SSM value — see "Secret rotation" in the
[secrets runbook](SECRETS-ROTATION.md).

### UptimeRobot configuration

| Setting | Value |
|---------|-------|
| Monitor type | HTTP(s) |
| URL | `https://quizonline.foxugly.com/health/` |
| Interval | 5 min (free) / 1 min (Pro) |
| Success status codes | `200` only |
| Keyword (Pro only) | `"status": "ok"` — triggers an alert when Celery flips while DB/cache still serve, which the bare 503 check misses |

Alerts notify `rvilain@foxugly.com`. Slack / SMS escalation is a Pro
plan add-on — bridge when the first paying customer lands; until
then the email channel is enough.

### Nginx exposes the endpoint

Django mounts `/health/` (not `/api/health/`) — see `config/urls.py`.
The nginx site config has a dedicated `location = /health/` block
that proxies to gunicorn so the SPA's catch-all `location /` does
not swallow it and serve `index.html` to the monitor. If you ever
move from this nginx template, port that block.

---

## Getting onto the box

Two paths:

1. **SSH** — `ssh ubuntu@<instance-ip>` with the `.pem`/`.ppk`
   keypair specified at instance launch. Same key that used to be
   reused by the old GH Actions workflow; now it is yours alone.
2. **AWS SSM Session Manager** (no SSH key needed):

   ```bash
   aws ssm start-session --target <instance-id> --region eu-west-1
   ```

   Drops you in a shell as `ssm-user`. `sudo -u django bash` to act
   as the app user. Audited via CloudTrail, no inbound port 22
   needed if you ever want to lock down the security group.

---

## Bootstrap a fresh EC2 box (one-shot)

Most teams don't do this more than once. Reference order if you
ever rebuild:

1. **Launch instance** in eu-west-1, Ubuntu 24.04 LTS, attach the
   `quizonline-ec2` IAM role (creates SSM connectivity).
2. **System packages**:
   ```bash
   sudo apt update && sudo apt install -y \
       git python3-venv python3-pip nodejs npm \
       nginx postgresql-client redis-tools \
       certbot python3-certbot-dns-route53 \
       gettext
   sudo snap install amazon-ssm-agent --classic
   curl -L https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o /tmp/awscliv2.zip
   unzip -q /tmp/awscliv2.zip -d /tmp && sudo /tmp/aws/install
   ```
3. **App user**:
   ```bash
   sudo useradd -m -g www-data -s /bin/bash django
   ```
4. **Repo + venv**:
   ```bash
   sudo mkdir -p /var/www/django_websites
   sudo chown django:www-data /var/www/django_websites
   sudo -u django git clone https://github.com/Foxugly/QuizOnline.git \
       /var/www/django_websites/QuizOnline
   cd /var/www/django_websites/QuizOnline/quizonline-server
   sudo -u django python3 -m venv .venv
   sudo -u django .venv/bin/pip install -r requirements.txt
   ```
5. **Seed SSM Parameter Store** from a local `.env`:
   ```bash
   # Local laptop (or wherever you have AWS creds with ssm:PutParameter):
   cp deploy/env.production.example ./prod.env
   $EDITOR ./prod.env           # fill in real values
   bash deploy/seed-parameter-store.sh --dry-run ./prod.env   # review
   bash deploy/seed-parameter-store.sh ./prod.env             # upload
   shred -u ./prod.env          # don't leave it on disk
   ```
   `SECRET_KEY`, `JWT_SIGNING_KEY`, `DATABASE_URL`, `EMAIL_HOST_PASSWORD`,
   `MS_GRAPH_CLIENT_SECRET`, `DEEPL_AUTH_KEY`, `SENTRY_DSN` and
   `SENTRY_FRONTEND_DSN` upload as `SecureString`; the rest as
   plain `String`.
6. **systemd units** (the env-fetch + frontend-runtime-fetch units
   run their helpers straight from the git checkout — no
   `/usr/local/bin/` install needed):
   ```bash
   # On EC2 (from /var/www/django_websites/QuizOnline):
   # Least-privilege sudo grants so the `django` user (CI / redeploy.sh) can
   # sync the 3 app unit files + restart/reload services without a password.
   sudo install -m 0440 -o root -g root \
       deploy/sudoers/quizonline-deploy /etc/sudoers.d/quizonline-deploy
   sudo visudo -cf /etc/sudoers.d/quizonline-deploy   # must print "parsed OK"

   sudo cp deploy/quizonline-*.service deploy/quizonline-*.timer /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now quizonline-env-fetch.service
   # Verify the tmpfs .env was created:
   sudo stat -c '%a %U:%G %n' /run/quizonline/.env   # expect 640 django:www-data
   sudo systemctl enable --now quizonline-gunicorn quizonline-celery quizonline-celery-beat
   sudo systemctl enable --now quizonline-backup.timer
   sudo systemctl enable --now quizonline-frontend-runtime-fetch.service
   # Verify the snippet was generated:
   sudo cat /etc/nginx/snippets/quizonline-frontend-runtime.conf
   ```
7. **nginx + TLS**:
   ```bash
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/quizonline
   sudo ln -s /etc/nginx/sites-available/quizonline /etc/nginx/sites-enabled/
   sudo certbot --nginx -d quizonline.foxugly.com   # or DNS-01 if wildcard
   sudo nginx -t && sudo systemctl reload nginx
   ```
8. **First deploy**: `gh workflow run Deploy --repo Foxugly/QuizOnline`.

The AWS-side prereqs (IAM roles, OIDC provider, S3 bucket) are
expected to already exist — those are account-level, not
instance-level.

---

## Compression (gzip / brotli)

### What's active in prod

- **gzip:** ``on`` at the http {} level (Ubuntu default) **plus** an
  explicit ``gzip_types`` block in the server {} so JS / CSS / JSON
  / SVG / woff2 are gzipped (not just text/html). See
  ``deploy/nginx.conf`` — the gzip block ships ready-to-use.
- **brotli:** ``on``, ``brotli_comp_level 5``. Opt-in — see
  "Enable brotli on a fresh host" below.

### Measured impact (Angular main.js, 183 439 bytes raw)

| Encoding | Bytes on wire | Saving |
|---|---|---|
| identity (raw) | 183 439 | — |
| gzip (level 6) | 34 402 | **-81 %** |
| brotli (level 5) | 32 804 | **-82 %** |

The marginal brotli-vs-gzip gain at level 5 is small on already-
minified JS. Level 11 would shave another ~10-15 % but at a real
CPU cost per request; for QuizOnline's traffic profile, level 5 is
the right CPU/size trade-off. Pre-compression (``brotli_static on``
+ ``.br`` files produced at build time) would unlock level 11
without runtime CPU cost — left as a future Angular-build-side
investment.

### Enable brotli on a fresh host

After ``nginx`` and the sites-available config are in place:

```bash
# 1. Install the brotli filter module (Ubuntu 24.04 / noble).
sudo apt-get install -y \
    libnginx-mod-http-brotli-filter \
    libnginx-mod-http-brotli-static

# 2. Verify the module wired itself into /etc/nginx/modules-enabled/
ls /etc/nginx/modules-enabled/ | grep brotli
# expect: 50-mod-http-brotli-filter.conf, 50-mod-http-brotli-static.conf

# 3. Uncomment the brotli block in the live sites-available file.
#    deploy/nginx.conf ships it commented out — the sed below
#    uncomments both the top-level directives and the indented
#    brotli_types list in one pass.
LIVE=/etc/nginx/sites-available/quizonline.foxugly.com
sudo cp "$LIVE" "${LIVE}.bak-pre-brotli-$(date -u +%Y%m%dT%H%M%S)"
sudo sed -i 's/^    # brotli/    brotli/'   "$LIVE"
sudo sed -i 's/^    #     /        /'       "$LIVE"

# 4. Verify the block now reads as code, not comments.
sudo grep -A 16 "^    brotli" "$LIVE"

# 5. Test syntax + reload.
sudo nginx -t
sudo systemctl reload nginx
```

### Smoke-test compression

The bundle hash changes on every deploy. Resolve the current one
then probe with each encoding:

```bash
BUNDLE=$(curl -sL https://quizonline.foxugly.com/ | grep -oE 'main-[^"]*\.js' | head -1)
echo "current bundle: $BUNDLE"

# Expected: Content-Encoding: gzip (or br when client supports it)
curl -H 'Accept-Encoding: br'   -sI "https://quizonline.foxugly.com/$BUNDLE" | grep -i content-encoding
curl -H 'Accept-Encoding: gzip' -sI "https://quizonline.foxugly.com/$BUNDLE" | grep -i content-encoding

# Wire-size comparison
echo "identity: $(curl -H 'Accept-Encoding: identity' -s "https://quizonline.foxugly.com/$BUNDLE" | wc -c)"
echo "gzip:     $(curl -H 'Accept-Encoding: gzip'     -s "https://quizonline.foxugly.com/$BUNDLE" | wc -c)"
echo "brotli:   $(curl -H 'Accept-Encoding: br'       -s "https://quizonline.foxugly.com/$BUNDLE" | wc -c)"
```

If any of the encoded sizes equals the identity size, the
corresponding compression isn't active on that asset type — re-check
``gzip_types`` / ``brotli_types`` in the live sites-available file.

---

## Related docs

- [`SECRETS-ROTATION.md`](SECRETS-ROTATION.md) — per-credential
  rotation procedures + EBS encryption verification.
- [`COURSE-INVITE-RUNBOOK.md`](COURSE-INVITE-RUNBOOK.md) —
  feature-specific rollback (3 levels), monitoring queries, and
  recovery commands for the LMS course-invite flow.
- [`MIGRATE-TO-POSTGRES.md`](MIGRATE-TO-POSTGRES.md) — step-by-step
  cut-over from SQLite to a local PostgreSQL instance on the EC2,
  with rollback path and a `pgloader` variant for larger volumes.
- [`env.production.example`](env.production.example) — reference
  `.env` shape for the backend.
- [`quizonline-frontend-runtime.conf.example`](quizonline-frontend-runtime.conf.example) —
  nginx snippet for the frontend Sentry DSN. Kept for documentation;
  the live snippet at `/etc/nginx/snippets/quizonline-frontend-runtime.conf`
  is now auto-generated from SSM by
  `quizonline-frontend-runtime-fetch.service`.
- `apache.conf` — legacy Apache template, kept for parity. Not used.
