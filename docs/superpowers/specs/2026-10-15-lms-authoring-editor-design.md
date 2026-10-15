# LMS authoring editor — design spec

**Date:** 2026-10-15
**Status:** Approved in conversation (owner), section by section. Ready for implementation plan.

## Goal

Make building a course frictionless: add sections and lessons in one gesture, and move
between the course structure and a lesson's content without losing context.

**Success criterion:** an instructor builds a course of 3 sections × 3 lessons, each with
content, without opening a single dialog and without manually returning to the structure
tab.

### What the owner said

- The creation **dialogs** for sections and lessons are painful.
- The **back-and-forth** between the structure tab (`/course/{id}/edit`) and the lesson
  content page (`/lesson/{id}/edit`) is painful.
- Other languages must be **filled by machine translation** (DeepL), not typed up front.
- Reference: Moodle 4.x (course index, inline add / rename, activity chooser, visible by
  default).

### Out of scope

- The course-creation form itself (it only changes where it lands, see §1).
- The publication model: sections and lessons are still created as **drafts**; the
  course-level publish rules are unchanged.
- Moving blocks between lessons, bulk-edit mode, activity types other than "lesson".

### Current state (2026-10-15, after QuizOnline#184 / #185)

- `course-edit` has 4 tabs (info / structure / enrollment / analytics); the tab is not in
  the URL, so every return lands on "info".
- `structure-tab` (≈830 lines) creates sections and lessons through multilingual dialogs;
  each row shows 2 toggles and 3 buttons.
- `lesson-edit` (≈180 lines) is a thin page around `<app-block-list-editor>`.
- The server picks `order` and the lesson `slug` on create (#185); the course structure
  payload is `LessonSummary` (no blocks).
- Lessons can only be reordered **within** their section.

## 1. Layout and navigation

- `course-edit` keeps its tabs; "Structure" is renamed **"Contenu"** (FR) / "Content"
  (EN). The active tab lives in the URL: `?tab=info|content|enrollment|analytics`
  (default `info`, unknown value → `info`).
- The **content** tab is a two-pane editor:
  - **left** (~300 px, sticky, own scroll): the course outline (§2);
  - **right**: the selected lesson's content (§4), or an empty state "Select or create a
    lesson" when none is selected.
- The selected lesson lives in the URL: `/course/{id}/edit?tab=content&lesson={lessonId}`.
  Selection uses `router.navigate` with query params (no component reload), so browser
  back / forward, reload and shared links work. A `lesson` id that is not in the course
  → empty state + toast.
- `/lesson/{id}/edit` stays as a route but only **redirects**: it loads the lesson
  (`GET /lesson/{id}/` already returns `course_id`) and navigates to the course editor
  with that lesson selected (`replaceUrl: true`).
- After course creation (`course-create`), navigate to
  `/course/{id}/edit?tab=content` instead of the learner page.
- Below 900 px the outline becomes a collapsible panel above the content.

## 2. Course outline (left pane)

New component `CourseOutline` (under `pages/course-edit/tabs/content-tab/`), replacing
`structure-tab` in the content tab.

### Inline creation

- **"+ Lesson"** under each section opens an inline text input (focused).
  **Enter** → `POST /lesson/` with `{section, translations: {<course language>: {title}}}`
  → the new row is inserted from the response and **selected** (opens on the right).
  **Escape** → cancel. Empty or whitespace-only title → no request.
- **"+ Section"** at the bottom of the outline: same input. **Enter** → `POST /section/`
  → row inserted, then the "+ Lesson" input of that new section opens.
- While a create is in flight the input is disabled and shows a spinner; on error the
  typed text is kept and the server `detail` is shown in a toast.

### Inline rename

- Double-click on a title, or the pencil icon → inline input prefilled with the
  course-language title. **Enter** → `PATCH` with
  `translations: {<course language>: {title}}` (other languages untouched). **Escape** →
  cancel.

### Row layout

- Each row: drag handle, title, an `<app-status-badge>` (draft / published, plus "free
  preview" for lessons), a discreet **"NL, IT missing"** hint when some allowed
  languages have an empty title, and a **"⋯" menu**:
  - Publish / Unpublish (existing endpoints; a failed pre-condition shows the server
    reason, as today);
  - Free preview on / off (lessons);
  - Translations… → opens the existing multilingual dialog (kept, edit mode only) for
    fine edits and the "translate from this tab" button;
  - Delete → confirmation dialog, then the existing delete endpoint.
- The selected lesson row is highlighted.

### Local updates

- Create, rename, publish, delete and move update the outline **from the API response**;
  no full course reload. The parent `course` signal is patched so the other tabs stay
  consistent.

### Reordering (PR 3)

- Drag and drop of sections (existing `section/reorder`).
- Drag and drop of lessons **within and across sections** (`cdkDropListGroup`): within
  a section → existing `section/{id}/lesson/reorder`; across sections →
  `POST /lesson/{id}/move/` (§3.1).

## 3. Server

### 3.1 Move a lesson — `POST /api/v1/lesson/{id}/move/`

- Body: `{section: <id>, position: <int ≥ 0>}`. Instructor-only (same permission as
  lesson edit). The target section must belong to the **same course** (else 400).
- Service `lesson.services.move_lesson(*, lesson, section, position)`, atomic, locks
  both sections:
  1. if the slug is taken in the target section, make it unique (`-2`, `-3`… — reuse
     `_unique_lesson_slug` from #185, moved to `lesson/services.py`);
  2. set `lesson.section` and a temporary `order` out of range, save;
  3. `compact` the source section; `two_phase_reorder` the target section with the
     lesson inserted at `position` (clamped to `[0, len]`).
- Blocks, progress and quiz bindings stay attached to the lesson (FKs unchanged).
- Response: the target section (`SectionSerializer`), plus the source section id, so the
  front can patch both.
- Same section → equivalent to a reorder.

### 3.2 Machine translation on create

- New Celery task `course.tasks.fill_missing_translations(model_label, pk)`, enqueued with
  `transaction.on_commit` from `SectionSerializer.create` and
  `LessonDetailSerializer.create`.
- Source language = `course.language.code`. Targets = the domain's allowed languages
  minus the source. Fields: `title` (section, lesson) and `description` (section, as
  HTML).
- Fills **only empty** values; never overwrites. One `deepl_translate_many` call per
  target language.
- No-op when `USE_DEEPL` is false or `DEEPL_AUTH_KEY` is empty. A DeepL error is logged
  (and reaches Sentry) and leaves the languages empty; the create itself has already
  succeeded.
- Rename never triggers it (§2 "Inline rename").

## 4. Lesson content pane (right pane)

- Extract the body of `lesson-edit` into a reusable `LessonContentEditor` component
  (`shared/learning/lesson-content-editor/`), input `lessonId`. It owns loading the
  lesson detail, the preview toggle and `<app-block-list-editor>` — no change to the
  block editors.
- Header: lesson title (inline rename, same behaviour as the outline, kept in sync),
  status badge, "Preview" (learner view), previous / next lesson buttons (from
  `prev_lesson` / `next_lesson`, they cross sections) which change the `lesson` query
  param.
- **Unsaved-work guard (PR 3):** `block-list-editor` exposes `hasUnsavedChanges()` (a
  block currently in edit mode with changes). Switching lesson, switching tab or leaving
  the page while it is true → confirmation "unsaved changes will be lost". Route leave
  uses a `canDeactivate` guard.

## 5. i18n

- Every new label in the 5 languages (FR, EN, NL, IT, ES) in `public/i18n/*.json`; new
  page-scoped dictionaries registered in `scripts/check-i18n.ts`.
- Labels removed with the dialogs' create mode stay if still used by the
  "Translations…" dialog.

## 6. Testing

- **Backend (pytest):** `move_lesson` — across sections keeps blocks, slug made unique,
  both sections dense 0..N-1, position clamped, other course → 400, non-instructor →
  403; `fill_missing_translations` with DeepL mocked — fills only empty values, no-op
  without key, swallows DeepL errors, enqueued on create but not on update.
- **Frontend (unit):** outline — Enter creates and selects, Escape cancels, empty title
  sends nothing, error keeps text; rename; content tab reads/writes `tab` and `lesson`
  query params; unsaved guard blocks a lesson switch until confirmed.
- **E2E (Playwright, fullstack):** create a course → land on the content tab → add a
  section → add a lesson → add a rich-text block → reload keeps the lesson open; no
  dialog opened along the way.

## 7. Delivery

Three PRs, each shippable on its own:

1. **Server:** `move` endpoint + service, `fill_missing_translations` task + on-commit
   hooks, OpenAPI regen.
2. **Two-pane editor:** `?tab=` / `?lesson=` URL state, `CourseOutline` (inline create
   and rename, "⋯" menu, missing-language hint, local updates), `LessonContentEditor`
   extraction, `/lesson/{id}/edit` redirect, post-create redirect, i18n, unit + e2e
   tests.
3. **Reordering and safety:** cross-section drag and drop via `move`, unsaved-work guard
   (`hasUnsavedChanges`, confirm on switch, `canDeactivate`).
