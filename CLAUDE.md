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

- CI builds the frontend bundle (not the EC2 instance, memory-limited)
- SCP bundle to EC2, then SSH to run `deploy/redeploy.sh`
- `deploy/redeploy.sh` handles git pull, pip install, migrate, collectstatic, service restart, health checks
- Service files: `deploy/quizonline-gunicorn.service`, `deploy/quizonline-celery.service`, `deploy/quizonline-celery-beat.service`
- Apache reverse proxy with config in `deploy/apache.conf`

## OpenAPI sync

Synchronize the API contract between backend and frontend:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-openapi.ps1
```

This regenerates `quizonline-frontend/src/app/api/generated` from the backend schema.
