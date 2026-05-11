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
- `ui-text/` : page content and general UI text

## Backend conventions

- Admin endpoints: protected with `IsSuperUser` permission class
- Rate limiting: `ScopedRateThrottle` on public endpoints
- Email: outbox pattern with Celery delivery
- Tests: `pytest` and Django test runner

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
