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
- Every new page-scoped dictionary must be registered in `quizonline-frontend/scripts/check-i18n.ts` so the build-time completeness check covers it
- **EN terminology**: the LMS / quiz concept formerly labelled "Subject" is rendered as "Topic" in English (FR/NL/IT/ES keep `Sujet` / `Onderwerp` / `Argomento` / `Tema`). Code identifiers (`SubjectService`, `subject_ids`, route `/subject/...`, JSON keys `"subjects"`) still use the canonical backend name — the rename is purely user-facing.

## Shared UI building blocks

- `<app-page-header [title]>` (under `shared/components/page-header/`) is the canonical page header used by every LMS shell. Three slots: `[slot=left]` / centered title / `[slot=right]`. Project content **directly** onto the slot (no inner wrapping `<div slot="left">`) so the slot's `gap: 0.5rem` applies between siblings. `@if` / `@for` work transparently — the projected elements still match the slot selector after the conditional resolves.
- `<app-block-translate-button>` (under `shared/learning/block-editors/block-translate-button.ts`) is the inline "translate from current tab" affordance every translatable block editor renders next to its language tabs. Reads the active tab as source, fills blanks only.
- `<app-lesson-reader>` (under `shared/learning/lesson-reader/`) is the shared outline + body + scroll-spy host used by both `/lesson/{id}` (with `scrollSpy=true`) and the preview mode of `/lesson/{id}/edit`. Owns the single `block-{id}` anchor scheme.
- `shared/learning/default-lang.ts` exposes `pickDefaultLang(availableLangs, userLang)` — every multilingual editor uses this to pick the initial active tab (user's UI language when allowed, else first allowed language).

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

## Domain features (Phase E — LMS)

LMS lives in flat Django apps mounted at `/api/` (no `/api/lms/` prefix):

- `course/` + `lesson/` + `block/` : `Course / Section / Lesson / Block` (parler-translated). All content scoped to a `Domain`. `Block` has 8 types (`rich_text / image / video / file / quiz / callout / code / embed`) validated by `.clean()`. HTML in `rich_text` is sanitised via `nh3` on save (XSS-safe whitelist).
- `enrollment/` + `certificate/` : `CourseEnrollment / LessonProgress / CourseProgress / Certificate / CertificateSequence`. Services handle the lifecycle: `enroll_user_to_course` (3 modes), `mark_lesson_completed`, `calculate_course_progress`, `issue_certificate_if_eligible`. Celery + `reportlab` render the certificate PDF on-commit. On-commit notifications send 5 email templates (enrollment created/approved/rejected, course completed, certificate issued) localised via `gettext` + `.po`.
- `assessment/` : `LessonQuiz` bridge to `quiz.QuizTemplate`. `post_save` signal on `quiz.Quiz` propagates passing scores (`>= required_score_percent`) to `enrollment.mark_lesson_completed` and to `issue_certificate_if_eligible` for course-level final quizzes.

Roles map directly onto existing Domain roles: superuser = admin; Domain owner/manager = instructor; Domain member = learner. No new permission tables.

A Course's primary `language` and parler translations are constrained to `Domain.allowed_languages` — enforced at the model `.clean()` level AND in `TranslationsField.to_internal_value()`.

Key endpoints under `/api/` (`config/api_urls.py`):
- `course/`, `section/`, `lesson/`, `block/` — CRUD + `reorder` actions + `publish` / `unpublish` / `clone` on courses
- `course/?domain=<id>&level=<lvl>` — list filters consumed by the catalog dropdowns
- `course/{id}/analytics/` — instructor-gated aggregated KPIs (enrollment counts, completion rate, median progress, certificates issued, 30-day enrollment trend) used by the course-edit "Analytics" tab
- `enrollment/`, `course/{id}/enroll/`, `lesson/{id}/start/`, `lesson/{id}/complete/`
- `progress/`, `me/progress/`
- `certificate/`, `certificate/{id}/pdf/`, `verify/{token}/` (public, anon throttle scope `lms_cert_verify`)
- `validation-quiz/`

`LessonDetailSerializer` is the read-heavy shape consumed by both `lesson-view` (learner) and `lesson-edit` (instructor). On top of the model fields it surfaces:
- `course_id` / `course_slug` / `domain_id` — used by back buttons, the quiz-template picker scope, and routing
- `can_manage` — gates the instructor "Edit" affordance + every write action on the lesson
- `prev_lesson` / `next_lesson` (`{id, title}` or null) — power the lesson-view footer's previous / next chevron buttons. Ordered by `(section.order, lesson.order)` so the traversal bridges section boundaries.
- `section_title` + `position_in_section` (`{current, total}`) — power the "Leçon 2/5 — Setup" subtitle above the lesson title

`ContentBlock` exposes a translatable `title` field on every type (including `rich_text`, `quiz`, `code` — previously they had none). The title feeds the lesson-view block outline and the in-content card heading. Empty payload draft creates are explicitly allowed (`ContentBlockSerializer.validate` skips `full_clean` when `self.instance is None`, and `_filter_allowed_lang_codes` short-circuits on empty input so a domain with no `allowed_languages` does not 400 the empty-translation draft).

Frontend pages live directly under `pages/` (no `lms/` prefix):
- Learner: `catalog` (search + level + domain filters), `course-detail`, `lesson-view` (left block outline + prev/next footer + position subtitle), `progress`, `certificate-list`, `certificate-view`, `certificate-verify` (public, no auth)
- Instructor: `course-edit` (tabs: info / structure / enrollment / analytics — analytics tab pulls from `/api/course/{id}/analytics/` and renders KPIs + a 30-day sparkline), `lesson-edit` (drag-and-drop block builder via `@angular/cdk/drag-drop` + 8 block editors with explicit Save / Cancel / Édit per block + per-language translation tabs + inline translate button per editor + view-as-learner eye button). Callout blocks carry a semantic variant (info / success / warning / error) stored in `metadata.variant` that drives the left-border colour.
- Unified post-login hub: `/dashboard` aggregates LMS courses + certificates + quizzes + catalog (auth-gated)

Quiz block editor uses a `<p-autoComplete>` template picker scoped to the parent course's `domain_id` (from `LessonDetailSerializer.domain_id`); search by title, dropdown shows mode + question count. Image / file blocks use `<p-fileupload customUpload>` so the existing `UploadService` keeps owning the multipart PATCH. Video block auto-detects the provider from the URL (YouTube / Vimeo) and renders a live preview iframe.

The rich-text sanitizer (`block/sanitizer.py`) allows inline `style` attributes on a small set of formatting tags with a strict CSS allowlist (`color`, `background-color`, `text-align`, `text-decoration`, `font-weight/style/size`) so Quill colour / alignment round-trips through save — anything else (including `url(...)` and `expression(...)` payloads) is scrubbed.

Throttle scopes env-overridable + SSM-seedable (`/quizonline/prod/THROTTLE_LMS_*`):
- `lms_enroll` (default 20/min)
- `lms_block_write` (default 120/min)
- `lms_cert_verify` (default 60/min — anon)

Spec + plan:
- [docs/superpowers/specs/2026-05-18-lms-app-design.md](docs/superpowers/specs/2026-05-18-lms-app-design.md) — design spec
- [docs/superpowers/plans/2026-05-18-lms-app-implementation.md](docs/superpowers/plans/2026-05-18-lms-app-implementation.md) — implementation plan

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
