# State Display Harmonization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the three independent "state" axes (operational, publication, access) one coherent visual language and one set of backend patterns — without merging concepts that genuinely differ.

**Architecture:** Keep the three axes as distinct fields/concepts. Introduce ONE shared frontend badge component (`<app-status-badge>`) that renders any of the three families, plus ONE shared access-mode vocabulary used by both Domain and Course. On the backend, extract the duplicated `active` / `is_published` field+queryset logic into two abstract mixins, and make Section/Lesson publish auditable like Course.

**Tech Stack:** Angular 21 (signals, OnPush, `input()`), PrimeNG 21 (`p-tag`, `p-toggleswitch`), shared `UiTextService` i18n (FR/EN/NL/IT/ES), Django 6 abstract models + `SeparateDatabaseAndState` migrations, DRF `@action`, pytest.

---

## The three state families (ground truth)

| Family | Field(s) | Models | Default | Meaning |
|---|---|---|---|---|
| **Operational** | `active` (bool) | Subject, Question, Domain, Language, QuizTemplate, Quiz | `True` | enabled / retired |
| **Publication** | `is_published` (bool) + `published_at` | Course, Section, Lesson | `False` | draft → published lifecycle |
| **Access** | Domain: `public` + `join_policy`; Course: `enrollment_mode` | Domain, Course | open/auto | how members join |

Access-mode vocabulary (the unification target):

| Mode | Domain | Course (`enrollment_mode`) | Badge label key |
|---|---|---|---|
| Free / auto | `public=True` + `join_policy=AUTO` | `ENROLL_OPEN` | `access.open` |
| After validation | `public=True` + `join_policy ∈ {OWNER, OWNER_MANAGERS}` | `ENROLL_APPROVAL` | `access.approval` |
| Invitation-only | `public=False` | `ENROLL_INVITE` | `access.invite` |

**Reference paths (verified):**
- `quizonline-server/domain/models.py:16-19` (`JoinPolicy`), `:52-63` (`active`/`public`/`join_policy`)
- `quizonline-server/course/models.py:22-25,44-46` (`ENROLL_*`, `enrollment_mode`)
- `quizonline-server/config/models.py:5-22` (`AuditMixin`, the home for new mixins)
- `quizonline-server/course/querysets.py` (`CourseQuerySet.visible_to`), `lesson/querysets.py`
- `quizonline-server/course/services.py:199-220` (`publish_course`/`unpublish_course`, audit pattern)
- `quizonline-frontend/src/app/shared/components/empty-state/` (component pattern to mirror)
- `quizonline-frontend/src/app/shared/i18n/ui-text/{types.ts,fr,en,nl,it,es}.ts`, `ui-text.service.ts`
- `quizonline-frontend/scripts/check-i18n.ts` (i18n completeness registration)

---

## Decisions baked into this plan (flip before executing if you disagree)

1. **Inactive colour** → **grey (`secondary`)**, not red. **✅ CONFIRMED by owner — 2026-06-01.** (Inactive and draft intentionally share grey = "not live".)
2. **Section/Lesson publish** → **audited service + dedicated endpoints**, mirroring Course (Phase 5). **✅ CONFIRMED by owner (Option A) — 2026-06-01.**
3. **Course publish control** → **switch to a toggle**, same as section/lesson — ONE control language. Publish pre-condition (`≥ 1 published lesson`) is surfaced by intercepting a refused toggle and showing a toast, then reverting. **✅ CONFIRMED by owner — 2026-06-01.**
4. **Boolean renames** (`active` vs `is_published`) → **NO** rename. Reason: `?active=` is a quasi-public API contract; rename breaks URL/client compatibility for a cosmetic gain.
5. **Question "active" control** → **checkbox → `p-toggleswitch`** (align with Subject/Domain).

---

## Phase ordering

1. Phase 1 — shared `<app-status-badge>` + shared i18n dictionaries (isolated, no behaviour change).
2. Phase 2 — wire the badge into every list/header (replaces bare icons + ad-hoc `p-tag`).
3. Phase 3 — unify controls + fix i18n nits (Question toggle, French agreement, bulk-action verbs).
4. Phase 4 — backend mixins (`ActivatableMixin`, `PublishableMixin`) via state-only migrations.
5. Phase 5 — audited publish/unpublish for Section & Lesson (+ OpenAPI regen).

Phases 1-3 deliver 100% of the user-visible benefit. Phases 4-5 are invisible structural cleanup; they can be deferred or dropped without affecting 1-3.

---

## Phase 1 — Shared status/access badges

### Task 1: `<app-status-badge>` component

**Files:**
- Create: `quizonline-frontend/src/app/shared/components/status-badge/status-badge.ts`
- Create: `quizonline-frontend/src/app/shared/components/status-badge/status-badge.html`
- Test: `quizonline-frontend/src/app/shared/components/status-badge/status-badge.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {StatusBadgeComponent} from './status-badge';

describe('StatusBadgeComponent', () => {
  let fixture: ComponentFixture<StatusBadgeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({imports: [StatusBadgeComponent]});
    fixture = TestBed.createComponent(StatusBadgeComponent);
  });

  it('maps published → success severity', () => {
    fixture.componentRef.setInput('kind', 'published');
    fixture.componentRef.setInput('label', 'Publié');
    fixture.detectChanges();
    const tag = fixture.nativeElement.querySelector('p-tag');
    expect(tag.getAttribute('ng-reflect-severity') ?? tag.severity).toBe('success');
  });

  it('maps inactive → secondary severity (grey, not danger)', () => {
    fixture.componentRef.setInput('kind', 'inactive');
    fixture.componentRef.setInput('label', 'Inactif');
    fixture.detectChanges();
    const tag = fixture.nativeElement.querySelector('p-tag');
    expect(tag.getAttribute('ng-reflect-severity') ?? tag.severity).toBe('secondary');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- --include='**/status-badge.spec.ts'` (from `quizonline-frontend/`)
Expected: FAIL — cannot find module `./status-badge`.

- [ ] **Step 3: Implement the component**

```ts
import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {TagModule} from 'primeng/tag';

/** The visual kinds this badge can render. `active/published` are positive
 *  (green); `draft/inactive` are neutral (grey); access modes are informative. */
export type StatusBadgeKind =
  | 'active' | 'inactive'
  | 'published' | 'draft'
  | 'access-open' | 'access-approval' | 'access-invite';

const SEVERITY: Record<StatusBadgeKind, 'success' | 'secondary' | 'info' | 'warn'> = {
  active: 'success',
  inactive: 'secondary',
  published: 'success',
  draft: 'secondary',
  'access-open': 'success',
  'access-approval': 'warn',
  'access-invite': 'info',
};

const ICON: Record<StatusBadgeKind, string> = {
  active: 'pi pi-check-circle',
  inactive: 'pi pi-ban',
  published: 'pi pi-check-circle',
  draft: 'pi pi-file-edit',
  'access-open': 'pi pi-globe',
  'access-approval': 'pi pi-verified',
  'access-invite': 'pi pi-envelope',
};

/**
 * Unified state badge. Replaces bare status icons and ad-hoc <p-tag> usages
 * across lists, page headers and structure rows. Caller supplies the already
 * localised label (via UiTextService) and the semantic kind; the component
 * owns the severity + icon mapping so colour semantics stay consistent.
 */
@Component({
  selector: 'app-status-badge',
  imports: [TagModule],
  templateUrl: './status-badge.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  readonly kind = input.required<StatusBadgeKind>();
  readonly label = input.required<string>();

  readonly severity = computed(() => SEVERITY[this.kind()]);
  readonly icon = computed(() => ICON[this.kind()]);
}
```

```html
<!-- status-badge.html -->
<p-tag [value]="label()" [severity]="severity()" [icon]="icon()" [rounded]="true"></p-tag>
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- --include='**/status-badge.spec.ts'`
Expected: PASS (both specs).

- [ ] **Step 5: Commit**

```bash
git add quizonline-frontend/src/app/shared/components/status-badge/
git commit -m "feat(shared): add unified <app-status-badge> for state/access display"
```

### Task 2: Shared i18n dictionaries (`status` + `access`)

**Files:**
- Modify: `quizonline-frontend/src/app/shared/i18n/ui-text/types.ts` (add interface members)
- Modify: `quizonline-frontend/src/app/shared/i18n/ui-text/{fr,en,nl,it,es}.ts` (add values)
- Verify: `quizonline-frontend/scripts/check-i18n.ts` already covers `ui-text` (no new registration needed — confirm).

- [ ] **Step 1: Add the type members** to the `UiText` interface in `types.ts`:

```ts
status: {
  active: string;
  inactive: string;
  published: string;
  draft: string;
};
access: {
  open: string;        // free / automatic enrolment
  approval: string;    // enrolment after validation
  invite: string;      // invitation only
};
```

- [ ] **Step 2: Add values per language.** FR (`fr.ts`):

```ts
status: {active: 'Actif', inactive: 'Inactif', published: 'Publié', draft: 'Brouillon'},
access: {open: 'Inscription libre', approval: 'Après validation', invite: 'Sur invitation'},
```

EN (`en.ts`):

```ts
status: {active: 'Active', inactive: 'Inactive', published: 'Published', draft: 'Draft'},
access: {open: 'Open enrolment', approval: 'Approval required', invite: 'Invitation only'},
```

NL (`nl.ts`):

```ts
status: {active: 'Actief', inactive: 'Inactief', published: 'Gepubliceerd', draft: 'Concept'},
access: {open: 'Vrije inschrijving', approval: 'Na goedkeuring', invite: 'Alleen op uitnodiging'},
```

IT (`it.ts`):

```ts
status: {active: 'Attivo', inactive: 'Inattivo', published: 'Pubblicato', draft: 'Bozza'},
access: {open: 'Iscrizione libera', approval: 'Previa approvazione', invite: 'Solo su invito'},
```

ES (`es.ts`):

```ts
status: {active: 'Activo', inactive: 'Inactivo', published: 'Publicado', draft: 'Borrador'},
access: {open: 'Inscripción libre', approval: 'Tras validación', invite: 'Solo por invitación'},
```

- [ ] **Step 3: Run the completeness check**

Run: `npm run check:i18n` (from `quizonline-frontend/`)
Expected: PASS — no missing/extra/same-as-en for `status` / `access` across the 5 languages.

- [ ] **Step 4: Commit**

```bash
git add quizonline-frontend/src/app/shared/i18n/ui-text/
git commit -m "feat(i18n): shared status + access-mode vocabulary (FR/EN/NL/IT/ES)"
```

---

## Phase 2 — Wire the badge in everywhere

Each task: replace one site, then `npm run typecheck` + visual check. The label is read from `inject(UiTextService).ui().status.*` / `.access.*`. For access kinds, derive the kind from the model:

- Domain → `domain.public ? (domain.join_policy === 'auto' ? 'access-open' : 'access-approval') : 'access-invite'`
- Course → `{open:'access-open', approval:'access-approval', invite:'access-invite'}[course.enrollment_mode]`

### Task 3: Operational badge in Subject / Question lists

**Files (replace bare icon with badge):**
- Modify: `quizonline-frontend/src/app/pages/subject/list/subject-list.html:~78-83`
- Modify: `quizonline-frontend/src/app/pages/question/list/question-list.html:~116-120`
- Modify: `quizonline-frontend/src/app/pages/subject/edit/subject-edit.html:~86-90` (questions table)
- Add `StatusBadgeComponent` to each page's `imports`.

- [ ] **Step 1:** Replace the `@if (row.active) { <i .../> } @else { <i .../> }` icon block with:

```html
<app-status-badge
  [kind]="row.active ? 'active' : 'inactive'"
  [label]="row.active ? ui().status.active : ui().status.inactive" />
```

- [ ] **Step 2:** Remove now-dead `.active-icon` / `.inactive-icon` styles from the corresponding `.scss`.
- [ ] **Step 3:** Run `npm run typecheck` (Expected: PASS) and load each page to confirm badges render.
- [ ] **Step 4: Commit** — `refactor(ui): badge for subject/question active state`.

### Task 4: Publication badge in Course list / detail / edit

**Files (replace ad-hoc `<p-tag>` with badge):**
- Modify: `quizonline-frontend/src/app/pages/course-list/course-list.html:~96-100`
- Modify: `quizonline-frontend/src/app/pages/course-detail/course-detail.html:~44-49`
- Modify: `quizonline-frontend/src/app/pages/course-edit/course-edit.html:~86-91`

- [ ] **Step 1:** Replace each inline `<p-tag .../>` status chip with:

```html
<app-status-badge
  [kind]="course.is_published ? 'published' : 'draft'"
  [label]="course.is_published ? ui().status.published : ui().status.draft" />
```

- [ ] **Step 2:** Remove the now-redundant `statusLabels` / `publishedBadge` / `unpublishedBadge` keys from `course-list.i18n.ts` and `course-edit.i18n.ts` (and their 5-language values). Update the components to read `ui().status.*` instead.
- [ ] **Step 3:** Run `npm run check:i18n` (Expected: PASS — removed keys gone everywhere) and `npm run typecheck` (Expected: PASS).
- [ ] **Step 4: Commit** — `refactor(ui): badge for course publication state`.

### Task 5: Access-mode badges on Domain + Course

**Files:**
- Modify: `quizonline-frontend/src/app/pages/domain/list/domain-list.html` (add a status column — none today) with TWO badges: operational + access.
- Modify: `quizonline-frontend/src/app/pages/course-list/course-list.html` and `course-detail.html` to add the access badge next to the publication badge.

- [ ] **Step 1:** Domain row — render operational + access side by side:

```html
<app-status-badge
  [kind]="row.active ? 'active' : 'inactive'"
  [label]="row.active ? ui().status.active : ui().status.inactive" />
<app-status-badge
  [kind]="row.public ? (row.join_policy === 'auto' ? 'access-open' : 'access-approval') : 'access-invite'"
  [label]="row.public ? (row.join_policy === 'auto' ? ui().access.open : ui().access.approval) : ui().access.invite" />
```

- [ ] **Step 2:** Course — add the access badge:

```html
<app-status-badge
  [kind]="'access-' + (course.enrollment_mode === 'open' ? 'open' : course.enrollment_mode === 'approval' ? 'approval' : 'invite')"
  [label]="course.enrollment_mode === 'open' ? ui().access.open : course.enrollment_mode === 'approval' ? ui().access.approval : ui().access.invite" />
```

- [ ] **Step 3:** `npm run typecheck` (Expected: PASS); confirm both pages show the access mode.
- [ ] **Step 4: Commit** — `feat(ui): surface unified access-mode badge on domains and courses`.

---

## Phase 3 — Unify controls + fix i18n nits

### Task 6: Question active control → toggle switch

**Files:**
- Modify: `quizonline-frontend/src/app/components/question-editor-form/question-editor-form.html:3-7`

- [ ] **Step 1:** Replace `<p-checkbox formControlName="active" ...>` with the same `<p-toggleswitch formControlName="active">` + label markup used by `subject-editor-form.html:31-39`. Swap `CheckboxModule` for the toggle module in the component `imports` if no longer used.
- [ ] **Step 2:** Run the form's existing spec / `npm run typecheck` (Expected: PASS); confirm toggling still binds `active`.
- [ ] **Step 3: Commit** — `refactor(ui): question active uses toggle switch (consistency)`.

### Task 7: French agreement + bulk-action wording

**Files:**
- Modify: `quizonline-frontend/src/app/pages/course-edit/tabs/structure-tab/structure-tab.i18n.ts` (FR values)
- Modify: `subject/list` + `question/list` + `domain/list` i18n (bulk verbs, 5 langs)

- [ ] **Step 1:** In `structure-tab.i18n.ts` FR, make publication wording agree: `isPublishedLabel`, `sectionDialog.isPublishedField`, `lessonDialog.isPublishedField` all consistently `'Publié'` / `'Publiée'` per the noun (section = feminine → "Publiée"; generic toggle → "Publié"). Apply the matching agreement in NL/IT/ES if their grammar requires it.
- [ ] **Step 2:** Unify bulk-action verbs: pick one verb per language (e.g. EN "Set active" / "Set inactive") and apply across subject/question/domain list dictionaries.
- [ ] **Step 3:** Run `npm run check:i18n` (Expected: PASS).
- [ ] **Step 4: Commit** — `fix(i18n): publication agreement + consistent bulk-action verbs`.

### Task 8: Course publish → toggle + document the control convention

**Files:**
- Modify: `quizonline-frontend/src/app/pages/course-edit/course-edit.html:~24-50` (replace the publish/unpublish button pair)
- Modify: `quizonline-frontend/src/app/pages/course-edit/course-edit.ts` (`togglePublish()` → handle refusal)
- Modify: `CLAUDE.md` (Frontend conventions section)

The course already has `POST /api/course/{id}/publish/` and `/unpublish/` (the toggle calls these — NOT a raw PATCH — so the backend validation in `publish_course` still runs).

- [ ] **Step 1:** Replace the two `<p-button>` (draft/published states) in the page header with a single toggle, mirroring `structure-tab.html`'s section toggle:

```html
<p-toggleswitch
  [ngModel]="course().is_published"
  (onChange)="togglePublish($event.checked)"
  [pTooltip]="course().is_published ? ui().unpublishButton : ui().publishButton" />
```

- [ ] **Step 2:** In `togglePublish(next: boolean)`, call the publish/unpublish endpoint; on the 400 "no published content" error, **revert the toggle** (reset the signal to its previous value) and show the validation message via `AppToastService`:

```ts
togglePublish(next: boolean) {
  const call = next ? this.api.coursePublish(id) : this.api.courseUnpublish(id);
  call.subscribe({
    next: (c) => this.course.set(c),
    error: (e) => {
      this.course.update((c) => ({...c, is_published: !next})); // revert
      this.toast.error(e.error?.detail ?? this.ui().publishFailed);
    },
  });
}
```

- [ ] **Step 3:** Ensure a `publishFailed` i18n key exists (5 langs) in `course-edit.i18n.ts`; reuse the existing `publishButton`/`unpublishButton` tooltips.
- [ ] **Step 4:** Run `npm run check:i18n` + `npm run typecheck` (Expected: PASS). Manually verify: toggling on a course with no published lesson reverts + toasts.
- [ ] **Step 5:** Add a `CLAUDE.md` bullet: "**State controls**: use `<p-toggleswitch>` for every binary state (active, course/section/lesson publish). A publish toggle that fails validation reverts and toasts the reason. Display any state with `<app-status-badge>` — never a bare icon or ad-hoc `<p-tag>`."
- [ ] **Step 6: Commit** — `refactor(ui): course publish becomes a toggle + document the convention`.

---

## Phase 4 — Backend mixins (state-only)

### Task 9: `ActivatableMixin` + `PublishableMixin`

**Files:**
- Modify: `quizonline-server/config/models.py` (add two abstract mixins next to `AuditMixin`)
- Test: `quizonline-server/config/tests/test_state_mixins.py`

- [ ] **Step 1: Write the failing test**

```python
import pytest
from course.models import Course
from subject.models import Subject

@pytest.mark.django_db
def test_publishable_mixin_exposes_publish_helpers():
    assert hasattr(Course, "publish") and hasattr(Course, "unpublish")

@pytest.mark.django_db
def test_activatable_mixin_visible_queryset(domain):
    Subject.objects.create(domain=domain, active=False)
    s_on = Subject.objects.create(domain=domain, active=True)
    assert list(Subject.objects.visible()) == [s_on]
```

- [ ] **Step 2: Run, verify it fails**

Run: `pytest quizonline-server/config/tests/test_state_mixins.py -v`
Expected: FAIL — `publish` / `visible` not defined.

- [ ] **Step 3: Add the mixins** to `config/models.py`:

```python
from django.db import models
from django.utils import timezone


class ActivatableQuerySet(models.QuerySet):
    def visible(self):
        return self.filter(active=True)


class ActivatableMixin(models.Model):
    active = models.BooleanField(default=True, db_index=True)
    objects = ActivatableQuerySet.as_manager()

    class Meta:
        abstract = True


class PublishableMixin(models.Model):
    is_published = models.BooleanField(default=False, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def publish(self):
        self.is_published = True
        self.published_at = timezone.now()

    def unpublish(self):
        self.is_published = False
```

- [ ] **Step 4: Run, verify it passes**

Run: `pytest quizonline-server/config/tests/test_state_mixins.py -v`
Expected: PASS.

- [ ] **Step 5: Commit** — `feat(core): add Activatable/Publishable abstract mixins`.

### Task 10: Adopt mixins via state-only migrations

> **Critical:** the fields are identical to what each model already declares. Use `migrations.SeparateDatabaseAndState` so NO `ALTER TABLE` runs. Preserve field order and the composite indexes (`("domain","active")` on Subject/Question, `("domain","is_published")` on Course).

**Files (one model at a time; commit per model):**
- `subject/models.py` → inherit `ActivatableMixin` (drop local `active`)
- `question/models.py` → inherit `ActivatableMixin`
- `domain/models.py` → inherit `ActivatableMixin` (keep `public` + `join_policy` LOCAL — they are NOT operational state)
- `course/models.py` → inherit `PublishableMixin` (drop local `is_published`/`published_at`)
- `lesson/models.py` → inherit `PublishableMixin`
- `course/models.py` Section → inherit `PublishableMixin`

- [ ] **Step 1 (per model):** Change the base class, delete the now-inherited field declaration(s).
- [ ] **Step 2:** Generate the migration: `python manage.py makemigrations <app>`. If it proposes Remove/Add field operations, hand-edit it into a `SeparateDatabaseAndState(state_operations=[...], database_operations=[])` no-op.
- [ ] **Step 3:** `python manage.py migrate` then run that app's suite: `pytest quizonline-server/<app> -v` (Expected: PASS, no behaviour change).
- [ ] **Step 4:** `python manage.py makemigrations --check --dry-run` (Expected: "No changes detected").
- [ ] **Step 5: Commit** per model — `refactor(<app>): adopt <Mixin> (state-only migration)`.

### Task 11: Route visibility filters through the mixin querysets

**Files:**
- Modify: `subject/serializers.py:207` (`questions.filter(active=True)` → `.visible()`)
- Modify: `domain/views.py` (the repeated `filter(active=True)`) → `.visible()`
- Keep `course/querysets.py` `visible_to` (it has domain-role logic the mixin can't own); just ensure it composes with `is_published` from the mixin.

- [ ] **Step 1:** Replace inline `filter(active=True)` calls with `.visible()`.
- [ ] **Step 2:** Run `pytest quizonline-server -q` (Expected: full suite PASS).
- [ ] **Step 3: Commit** — `refactor(core): use Activatable.visible() at call sites`.

---

## Phase 5 — Audited publish for Section & Lesson

### Task 12: Publish/unpublish services + endpoints

**Files:**
- Modify: `quizonline-server/course/services.py` (add `publish_section`/`unpublish_section`, mirroring `publish_course` at `:199-220`, with `record_course_audit(action="section.publish")`)
- Modify: `quizonline-server/lesson/services.py` (or create) — `publish_lesson`/`unpublish_lesson`
- Modify: `course/views.py` + `lesson/views.py` — add `@action(detail=True, methods=["post"])` `publish`/`unpublish` guarded by the existing `IsLmsInstructorOrReadOnly`
- Test: `course/tests/test_publish_section.py`, `lesson/tests/test_publish_lesson.py`

- [ ] **Step 1: Write the failing test** (section example):

```python
@pytest.mark.django_db
def test_publish_section_endpoint_audits(api_client_instructor, section):
    url = f"/api/section/{section.id}/publish/"
    resp = api_client_instructor.post(url)
    assert resp.status_code == 200
    section.refresh_from_db()
    assert section.is_published is True
    assert section.course.audit_logs.filter(action="section.publish").exists()
```

- [ ] **Step 2: Run, verify it fails** — `pytest course/tests/test_publish_section.py -v` (Expected: 404, no such action).
- [ ] **Step 3: Implement** the service + `@action`, reusing the `publish_course` shape.
- [ ] **Step 4: Run, verify it passes** — Expected: PASS.
- [ ] **Step 5: Regenerate the OpenAPI client** (new endpoints changed the contract):

Run: `powershell -ExecutionPolicy Bypass -File .\scripts\sync-openapi.ps1`
> Must be in the SAME commit as the endpoint change — CI fails on drift otherwise.

- [ ] **Step 6:** Point the `structure-tab.html` section/lesson publish toggles at the new actions instead of a raw `PATCH`.
- [ ] **Step 7: Commit** — `feat(lms): audited publish/unpublish for sections and lessons` (includes regenerated client).

---

## Final verification (before any merge)

- [ ] Backend: `pytest quizonline-server -q` — all green.
- [ ] Backend: `python manage.py makemigrations --check --dry-run` — "No changes detected".
- [ ] Frontend: `npm run check:i18n` — 5 languages complete.
- [ ] Frontend: `npm run typecheck` && `npm run lint` && `npm run build`.
- [ ] OpenAPI: no drift (only relevant if Phase 5 done).
- [ ] E2E: `npm run test:e2e` covering catalog, course-edit (structure tab), subject/question lists, domain list.

---

## Self-review notes

- **Spec coverage:** P1 (badge) → Tasks 1-2; P2 (display) → Tasks 3-5; P3 (controls/nits) → Tasks 6-8; P5 (mixins) → Tasks 9-11; P6 (audit) → Task 12. Domain 3-axis + Course `enrollment_mode` alignment → Task 5. Decision #3 (keep course button pair) → no task = intentional no-op, documented in Task 8.
- **Not in scope (by design):** merging the three families into one `status` enum (P-fond), renaming booleans (decision #4).
- **Type consistency:** `StatusBadgeKind` values used in Tasks 3-5 all exist in the union defined in Task 1; i18n keys used in Phase 2 all defined in Task 2.
