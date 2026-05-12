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

- AWS EC2 with the repo checked out at `/var/www/django_websites/QuizOnline/`
- Django runs as user `django`, group `www-data`; gunicorn binds 127.0.0.1:8000
- Reverse proxy: **nginx** (the `deploy/apache.conf` template is kept for parity but the live server runs nginx)
- Live config template in `deploy/nginx.conf` — drop in `/etc/nginx/sites-available/quizonline`; locations `/`, `/api/`, `/admin/`, `/static/`, `/media/` plus the cache + security headers
- CI builds the frontend bundle (not on EC2 — memory-limited), GitHub Actions triggers Deploy on push to `main`
- `deploy/redeploy.sh` handles git pull, pip install, migrate, collectstatic, optional frontend build (`--skip-frontend`), service restart, health checks
- systemd units in `deploy/`: `quizonline-gunicorn.service`, `quizonline-celery.service`, `quizonline-celery-beat.service`
- Frontend bundle is served from `quizonline-frontend/dist/quizonline-frontend/browser/` (Angular `outputPath.browser` default); CSS-referenced media bundled to `bundle-media/` to avoid clashing with Django uploads at `/media/`

## OpenAPI sync

Synchronize the API contract between backend and frontend:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-openapi.ps1
```

This regenerates `quizonline-frontend/src/app/api/generated` from the backend schema.
