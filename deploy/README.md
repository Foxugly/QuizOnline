# Deployment

Operator runbook for the QuizOnline production environment. Companion
to [`SECRETS-ROTATION.md`](SECRETS-ROTATION.md) (one section per
credential) and [`env.production.example`](env.production.example)
(reference shape of the backend `.env`).

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
│   ├── .env                                 ← 600 django:www-data
│   └── .venv/                               ← Python venv
├── quizonline-frontend/
│   └── dist/quizonline-frontend/
│       ├── browser/                         ← live bundle (served by nginx)
│       └── browser.prev/                    ← previous bundle (rollback target)
└── deploy/                                  ← this directory
```

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

## AWS resources

All in **eu-west-1** unless noted.

| Resource | Name / ARN | Purpose |
|----------|------------|---------|
| OIDC provider | `arn:aws:iam::<ACCOUNT>:oidc-provider/token.actions.githubusercontent.com` | Lets GitHub Actions mint short-lived AWS tokens (audience `sts.amazonaws.com`). Global, one per account. |
| IAM role | `quizonline-deploy` | Assumed by GitHub Actions via OIDC. Trust policy scoped to `repo:Foxugly/QuizOnline:environment:production`. Inline policy `DeployViaSSM` grants `s3:PutObject` on `builds/*`, `ssm:SendCommand` on the EC2 instance + AWS-RunShellScript document, and `ssm:GetCommandInvocation` (resource `*` because command-id is dynamic). |
| IAM role | `quizonline-ec2` | EC2 instance role. Managed policies `AmazonSSMManagedInstanceCore` (+ `CloudWatchAgentServerPolicy`, dormant). Inline `S3ReadDeployBundles` grants `s3:GetObject` on `arn:aws:s3:::quizonline-deploy/builds/*` so SSM-invoked scripts can pull bundles. |
| S3 bucket | `quizonline-deploy` | Private, versioning on. Lifecycle `expire-old-builds`: current versions 14d, noncurrent 7d, incomplete multipart 7d. Bundles named `builds/<sha>.tar.gz`. |
| EC2 instance | (see AWS console — region eu-west-1) | t-class or larger. Ubuntu 24.04 LTS. SSM agent via snap, AWS CLI v2 from official installer. |

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
| `quizonline-gunicorn.service` | Django HTTP via gunicorn, binds 127.0.0.1:8000 | `quizonline-server/.env` |
| `quizonline-celery.service` | Celery worker (email outbox, async tasks) | `quizonline-server/.env` |
| `quizonline-celery-beat.service` | Celery beat scheduler | `quizonline-server/.env` |
| `quizonline-backup.service` + `.timer` | Daily DB backup | inline `Environment=` |

All run as `User=django, Group=www-data`. Gunicorn-access /
gunicorn-error logs live under `/var/log/quizonline/`. Celery logs
go to journald — `journalctl -u quizonline-celery`.

Reverse proxy is **nginx** (the `apache.conf` template is kept for
parity but unused on the live box). Live config lives at
`/etc/nginx/sites-available/quizonline`, sourced from
[`nginx.conf`](nginx.conf) in this directory. Optional frontend
runtime snippet at `/etc/nginx/snippets/quizonline-frontend-runtime.conf`
— see [`quizonline-frontend-runtime.conf.example`](quizonline-frontend-runtime.conf.example).

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
       certbot python3-certbot-dns-route53
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
5. **`.env`** from [`env.production.example`](env.production.example):
   ```bash
   sudo -u django cp /var/www/django_websites/QuizOnline/deploy/env.production.example \
       /var/www/django_websites/QuizOnline/quizonline-server/.env
   sudo -u django $EDITOR /var/www/django_websites/QuizOnline/quizonline-server/.env
   sudo chmod 600 /var/www/django_websites/QuizOnline/quizonline-server/.env
   ```
   The pre-flight guard in `redeploy.sh` refuses to deploy unless
   perms are `600 django:www-data`.
6. **systemd units**:
   ```bash
   sudo cp deploy/quizonline-*.service deploy/quizonline-*.timer /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now quizonline-gunicorn quizonline-celery quizonline-celery-beat
   sudo systemctl enable --now quizonline-backup.timer
   ```
7. **nginx + TLS**:
   ```bash
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/quizonline
   sudo ln -s /etc/nginx/sites-available/quizonline /etc/nginx/sites-enabled/
   sudo certbot --nginx -d quizonline.foxugly.com   # or DNS-01 if wildcard
   sudo nginx -t && sudo systemctl reload nginx
   ```
8. **(optional) Frontend Sentry**: drop
   [`quizonline-frontend-runtime.conf.example`](quizonline-frontend-runtime.conf.example)
   at `/etc/nginx/snippets/quizonline-frontend-runtime.conf`,
   replace placeholders, `nginx -t && systemctl reload nginx`.
9. **First deploy**: `gh workflow run Deploy --repo Foxugly/QuizOnline`.

The AWS-side prereqs (IAM roles, OIDC provider, S3 bucket) are
expected to already exist — those are account-level, not
instance-level.

---

## Related docs

- [`SECRETS-ROTATION.md`](SECRETS-ROTATION.md) — per-credential
  rotation procedures + EBS encryption verification.
- [`env.production.example`](env.production.example) — reference
  `.env` shape for the backend.
- [`quizonline-frontend-runtime.conf.example`](quizonline-frontend-runtime.conf.example) —
  nginx snippet for the frontend Sentry DSN.
- `apache.conf` — legacy Apache template, kept for parity. Not used.
