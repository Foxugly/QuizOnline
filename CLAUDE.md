# CLAUDE.md

## Project structure

Monorepo with two main modules:

- `quizonline-server/` : Django 6 backend (REST API, Celery, Redis)
- `quizonline-frontend/` : Angular 21 frontend (PrimeNG, generated API client)

## Frontend conventions

- Change detection: `OnPush` everywhere
- Dependency injection: `inject()` function, not constructor injection
- Signals: use Angular signals for reactive state
- Component I/O: `input()` / `output()` functions, not decorators
- Do NOT add `standalone: true` (it is the default in Angular 21)
- Layout pattern: meta-grid pattern for responsive layouts
- **Button sizing**:
  - `size="small"` only for actions inside a table row or tightly coupled to a list (row actions, inline list-item buttons, table toolbar buttons such as "Clear filters" / "Export CSV" that live in the same card as the table).
  - Default (no `size`) for page-level primary/secondary actions: page hero CTAs, form submit/cancel, dialog footer, page toolbar primary actions.
  - Never `size="large"`.
- **Empty states**: use `<app-empty-state>` (under `shared/components/empty-state/`) with `density="compact"` inside table empty rows and dropdowns, default density on page sections.
- **Dates in tables**: prefer `| relativeDate` over `| date:'short'` / `'medium'`. Keep the absolute date one hover away via `[attr.title]="value | date:'medium'"`. Keep `| date:` for genuinely future timestamps (e.g. `expires_at`) and for recap pages where exact dates matter.

## i18n

5 supported languages: FR, EN, NL, IT, ES.

- `editor-ui-text/` : labels for quiz editor UI
- `ui-text/` : shell, auth and admin UI text — accessed via `inject(UiTextService).ui` / `.editor`
- Page-scoped i18n lives next to the component (`pages/<page>/<page>.i18n.ts`) and is bound reactively through `inject(UiTextService).localized(getXxxUiText)`

## Backend conventions

- Admin endpoints: protected with `IsSuperUser` permission class
- Rate limiting: `ScopedRateThrottle` on public endpoints; every scope is overridable via `THROTTLE_*` env vars (see `.env.example`)
- Email: outbox pattern with Celery delivery
- Tests: `pytest` and Django test runner

## Domain features (Phase B / C / D)

Production-grade moderation, invitations and observability on every `Domain`:

- **Bulk approve / reject** join requests via `POST /api/domain/{id}/join-request/bulk-approve|bulk-reject/` (atomic, audited, returns `{processed, skipped}`)
- **Multi-domain invite** fan-out: `POST /api/domain/{id}/invite/` accepts `additional_domain_ids` to invite the same email list to several domains in one call; tighter `domain_invite_fanout` throttle bucket
- **Analytics** per domain: `GET /api/domain/{id}/analytics/` returns counters + acceptance rate + median time-to-decision + top deciders. Surfaced as the "Analytics" tab in `/domain/{id}/edit` and deep-linked via `?tab=analytics`
- **Moderation tile** (`GET /api/domain/moderation-summary/`) cached per-user 60 s with proactive invalidation on every mutation that changes pending count or the moderator set
- **Magic-link login** via `/api/auth/magic-link/request|exchange/` — passwordless sign-in
- **Transfer ownership** — `POST /api/domain/{id}/transfer/` issues a signed invitation to the future owner
- **Persistent invitations** (`DomainInvite`) with resend / revoke / accept-state lookup
- **Audit log** (`DomainAuditLog`) per domain, exposed in the edit page
- **Per-user notification preferences** on `CustomUser.notification_prefs`

## Deployment

- AWS EC2 in **eu-west-1**, repo at `/var/www/django_websites/QuizOnline/`
- App user `django`, group `www-data`; gunicorn binds 127.0.0.1:8000
- Reverse proxy: **nginx** (the `deploy/apache.conf` template is kept for parity but unused)
- **CI → Deploy pipeline** (GitHub Actions on push to `main`): assumes the `quizonline-deploy` IAM role via OIDC (no long-lived SSH key in GH Secrets), builds the Angular bundle on the runner, uploads it to S3 (`quizonline-deploy/builds/<sha>.tar.gz`), then fires `aws ssm send-command` against the EC2 instance. On the box, `deploy/ssm-deploy.sh` runs `redeploy.sh --skip-frontend` (backend update + service restart), atomically swaps the bundle, reloads nginx, and keeps the previous bundle at `browser.prev/` for a one-step rollback
- systemd units in `deploy/`: `quizonline-gunicorn.service`, `quizonline-celery.service`, `quizonline-celery-beat.service`, `quizonline-backup.service`+`.timer`
- Frontend bundle served from `quizonline-frontend/dist/quizonline-frontend/browser/` (Angular `outputPath.browser` default); CSS-referenced media bundled to `bundle-media/` to avoid clashing with Django uploads at `/media/`
- **Full operator runbook** (day-to-day deploy, manual deploy, 3-level rollback, AWS resources inventory, bootstrap a fresh EC2): **`deploy/README.md`**
- **Per-credential rotation procedures + EBS encryption check**: **`deploy/SECRETS-ROTATION.md`**

## OpenAPI sync

Synchronize the API contract between backend and frontend:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-openapi.ps1
```

This regenerates `quizonline-frontend/src/app/api/generated` from the backend schema.
