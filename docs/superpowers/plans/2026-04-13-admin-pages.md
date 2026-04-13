# Admin Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three admin pages (join requests dashboard, language management, stats dashboard) plus an Admin dropdown in the topmenu and a join-request badge on the domain list.

**Architecture:** One new backend endpoint (`GET /api/stats/dashboard/`) in `config/stats_views.py`. Three new Angular pages as standalone components, lazy-loaded. An Admin dropdown in the topmenu component. All user-facing text through the existing `UiText` i18n system.

**Tech Stack:** Django + DRF (backend stats endpoint), Angular 21 + PrimeNG (frontend pages), existing generated `DomainApi` + `LanguageApi` services.

**Spec reference:** `docs/superpowers/specs/2026-04-13-admin-pages-design.md`

---

## Pre-existing assets (no work needed)

- `superuserGuard` — already in `guards/superuser.guard.ts`, used in `app.routes.ts`
- `staffGuard` — already in `guards/staff.guard.ts`
- `UserService.isAdmin` — computed signal (`is_staff || is_superuser`)
- `UserService.isSuperuser` — computed signal (`is_superuser`)
- `DomainApi` — generated, has all join-request methods (`domainJoinRequestList`, `domainJoinRequestApproveCreate`, `domainJoinRequestRejectCreate`)
- `LanguageApi` — generated, has full CRUD (`langList`, `langCreate`, `langUpdate`, `langPartialUpdate`, `langDestroy`)
- `DomainReadDto` — already includes `pending_join_requests_count`, `my_join_request_status`, `join_policy`, `translations`

## File map

**New files**

| Path | Responsibility |
|------|---------------|
| `quizonline-server/config/stats_views.py` | Stats dashboard endpoint (single view, no model) |
| `quizonline-server/config/tests/test_stats.py` | Tests for the stats endpoint |
| `quizonline-frontend/src/app/services/stats/stats.ts` | StatsService wrapping the stats endpoint |
| `quizonline-frontend/src/app/pages/admin/stats/stats-dashboard.ts` | Stats dashboard page component |
| `quizonline-frontend/src/app/pages/admin/stats/stats-dashboard.html` | Stats dashboard template |
| `quizonline-frontend/src/app/pages/admin/languages/language-management.ts` | Language management page component |
| `quizonline-frontend/src/app/pages/admin/languages/language-management.html` | Language management template |
| `quizonline-frontend/src/app/pages/domain/join-requests/domain-join-requests.ts` | Join requests page component |
| `quizonline-frontend/src/app/pages/domain/join-requests/domain-join-requests.html` | Join requests template |

**Modified files**

| Path | Change |
|------|--------|
| `quizonline-server/config/api_urls.py` | Register stats endpoint |
| `quizonline-frontend/src/app/app.routes.ts` | Add 3 new routes |
| `quizonline-frontend/src/app/components/topmenu/topmenu.ts` | Add Admin dropdown |
| `quizonline-frontend/src/app/components/topmenu/topmenu.html` | Admin dropdown template |
| `quizonline-frontend/src/app/pages/domain/list/domain-list.ts` | Add join requests badge column |
| `quizonline-frontend/src/app/pages/domain/list/domain-list.html` | Badge column template |
| `quizonline-frontend/src/app/shared/i18n/ui-text.ts` | i18n keys for all 3 pages |

---

## Conventions

- **Backend test runner:** `cd quizonline-server && ../.venv/Scripts/python.exe manage.py test <module> -v 2`
- **Frontend typecheck:** `cd quizonline-frontend && npx --no-install tsc --noEmit -p tsconfig.app.json`
- **Frontend unit tests:** `cd quizonline-frontend && npm test`
- **Parler translations:** Domain names are in `translations` dict; frontend resolves via `user.currentLang`. Use the existing `selectTranslation()` helper from `shared/i18n/select-translation.ts` if it exists, otherwise access `translations[lang]?.name` directly.
- **PrimeNG imports:** Each component imports only the PrimeNG modules it uses (standalone component pattern). Common: `TableModule`, `ButtonModule`, `DialogModule`, `CardModule`, `TagModule`, `InputSwitchModule`, `SelectButtonModule`, `ProgressBarModule`.
- **i18n:** All labels go through `getUiText(lang)` from `shared/i18n/ui-text.ts`. Add new keys to the FR, EN, NL blocks at minimum.

---

## Task 1: Stats backend endpoint + tests

**Files:**
- Create: `quizonline-server/config/stats_views.py`
- Create: `quizonline-server/config/tests/test_stats.py`
- Modify: `quizonline-server/config/api_urls.py`

- [ ] **Step 1.1: Write failing test**

Create `quizonline-server/config/tests/__init__.py` (empty) if it doesn't exist, then create `quizonline-server/config/tests/test_stats.py`:

```python
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import translation
from rest_framework import status
from rest_framework.test import APIClient

from domain.models import Domain
from language.models import Language
from question.models import Question
from quiz.models import QuizTemplate, Quiz

User = get_user_model()


class StatsDashboardTests(TestCase):
    def setUp(self):
        translation.activate("fr")
        self.superuser = User.objects.create_user(
            username="super", password="pwd", is_staff=True, is_superuser=True
        )
        self.staff = User.objects.create_user(
            username="staff", password="pwd", is_staff=True
        )
        self.regular = User.objects.create_user(
            username="user", password="pwd"
        )
        self.lang_fr = Language.objects.create(code="fr", name="Francais", active=True)

        self.domain = Domain.objects.create(owner=self.staff, active=True)
        self.domain.set_current_language("fr")
        self.domain.name = "Test Domain"
        self.domain.save()
        self.domain.allowed_languages.set([self.lang_fr])
        self.domain.managers.add(self.staff)
        self.domain.members.add(self.regular)

        self.client = APIClient()

    def test_superuser_sees_all_stats(self):
        self.client.force_authenticate(user=self.superuser)
        res = self.client.get("/api/stats/dashboard/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("totals", res.data)
        self.assertIn("domains", res.data)
        self.assertIn("active_users", res.data["totals"])
        self.assertIn("active_domains", res.data["totals"])
        self.assertIn("active_questions", res.data["totals"])
        self.assertIn("completed_sessions", res.data["totals"])
        self.assertGreaterEqual(len(res.data["domains"]), 1)
        domain_data = res.data["domains"][0]
        self.assertIn("translations", domain_data)
        self.assertIn("members_count", domain_data)

    def test_staff_sees_only_own_domains(self):
        # Create a second domain the staff does NOT own/manage
        other_owner = User.objects.create_user(username="other", password="pwd", is_staff=True)
        other_domain = Domain.objects.create(owner=other_owner, active=True)
        other_domain.set_current_language("fr")
        other_domain.name = "Other Domain"
        other_domain.save()

        self.client.force_authenticate(user=self.staff)
        res = self.client.get("/api/stats/dashboard/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        domain_ids = [d["id"] for d in res.data["domains"]]
        self.assertIn(self.domain.id, domain_ids)
        self.assertNotIn(other_domain.id, domain_ids)

    def test_regular_user_forbidden(self):
        self.client.force_authenticate(user=self.regular)
        res = self.client.get("/api/stats/dashboard/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_unauthorized(self):
        res = self.client.get("/api/stats/dashboard/")
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
```

- [ ] **Step 1.2: Run test, confirm fail**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test config.tests.test_stats -v 2
```

Expected: 404 (URL not wired).

- [ ] **Step 1.3: Implement the stats view**

Create `quizonline-server/config/stats_views.py`:

```python
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from domain.models import Domain
from question.models import Question
from quiz.models import Quiz

User = get_user_model()


class StatsDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        user = request.user
        is_superuser = getattr(user, "is_superuser", False)

        # --- Scope domains ---
        if is_superuser:
            domains_qs = Domain.objects.filter(active=True)
        else:
            domains_qs = Domain.objects.filter(
                Q(owner=user) | Q(managers=user),
                active=True,
            ).distinct()

        # --- Per-domain breakdown ---
        domains_annotated = (
            domains_qs
            .prefetch_related("translations")
            .annotate(
                members_count=Count("members", distinct=True),
                managers_count=Count("managers", distinct=True),
                questions_count=Count(
                    "questions",
                    filter=Q(questions__active=True),
                    distinct=True,
                ),
                templates_count=Count(
                    "quiz_templates",
                    filter=Q(quiz_templates__active=True),
                    distinct=True,
                ),
                sessions_total=Count("quiz", distinct=True),
                sessions_completed=Count(
                    "quiz",
                    filter=Q(quiz__active=False) & ~Q(quiz__started_at=None),
                    distinct=True,
                ),
            )
            .order_by("id")
        )

        domains_data = []
        for d in domains_annotated:
            translations = {}
            for t in d.translations.all():
                translations[t.language_code] = {"name": t.name or ""}
            domains_data.append({
                "id": d.id,
                "translations": translations,
                "members_count": d.members_count,
                "managers_count": d.managers_count,
                "questions_count": d.questions_count,
                "templates_count": d.templates_count,
                "sessions_total": d.sessions_total,
                "sessions_completed": d.sessions_completed,
            })

        # --- Global totals (scoped) ---
        domain_ids = [d["id"] for d in domains_data]

        if is_superuser:
            active_users = User.objects.filter(is_active=True).count()
            active_questions = Question.objects.filter(active=True).count()
        else:
            active_users = (
                User.objects.filter(
                    Q(linked_domains__in=domain_ids)
                    | Q(managed_domains__in=domain_ids)
                    | Q(owned_domains__in=domain_ids)
                )
                .distinct()
                .count()
            )
            active_questions = Question.objects.filter(
                domain_id__in=domain_ids, active=True
            ).count()

        completed_sessions = Quiz.objects.filter(
            domain_id__in=domain_ids if not is_superuser else [],
            active=False,
        ).exclude(started_at=None)
        if is_superuser:
            completed_sessions = Quiz.objects.filter(active=False).exclude(started_at=None)
        completed_count = completed_sessions.count()

        return Response({
            "totals": {
                "active_users": active_users,
                "active_domains": len(domains_data),
                "active_questions": active_questions,
                "completed_sessions": completed_count,
            },
            "domains": domains_data,
        })
```

- [ ] **Step 1.4: Wire the URL**

In `quizonline-server/config/api_urls.py`, add:

```python
from config.stats_views import StatsDashboardView
```

And in `urlpatterns`:

```python
path("stats/dashboard/", StatsDashboardView.as_view(), name="stats-dashboard"),
```

- [ ] **Step 1.5: Run tests, confirm pass**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test config.tests.test_stats -v 2
```

Expected: 4 tests OK.

- [ ] **Step 1.6: Run full backend suite**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test
```

Expected: all pass.

- [ ] **Step 1.7: Commit**

```bash
git add quizonline-server/config/stats_views.py quizonline-server/config/tests/ quizonline-server/config/api_urls.py
git commit -m "feat(stats): add GET /api/stats/dashboard/ endpoint with domain-scoped counts"
```

---

## Task 2: i18n entries for the 3 pages

**Files:**
- Modify: `quizonline-frontend/src/app/shared/i18n/ui-text.ts`

- [ ] **Step 2.1: Add i18n keys to the UiText type and all language blocks**

Open `quizonline-frontend/src/app/shared/i18n/ui-text.ts`. Find the `UiText` type definition and the FR/EN/NL constant blocks. Add a new `admin` section:

Add to the `UiText` type:
```typescript
admin: {
  menuLabel: string;
  stats: {
    title: string;
    activeUsers: string;
    activeDomains: string;
    activeQuestions: string;
    completedSessions: string;
    domain: string;
    members: string;
    managers: string;
    questions: string;
    templates: string;
    sessions: string;
    completion: string;
  };
  languages: {
    title: string;
    addLanguage: string;
    code: string;
    name: string;
    active: string;
    editLanguage: string;
    deleteConfirm: string;
    actions: string;
  };
  joinRequests: {
    title: string;
    user: string;
    email: string;
    requestedAt: string;
    status: string;
    actions: string;
    approve: string;
    reject: string;
    rejectReason: string;
    rejectReasonPlaceholder: string;
    pending: string;
    approved: string;
    rejected: string;
    cancelled: string;
    all: string;
    noRequests: string;
  };
};
```

Add FR values:
```typescript
admin: {
  menuLabel: 'Administration',
  stats: {
    title: 'Statistiques',
    activeUsers: 'Utilisateurs actifs',
    activeDomains: 'Domaines actifs',
    activeQuestions: 'Questions actives',
    completedSessions: 'Sessions terminées',
    domain: 'Domaine',
    members: 'Membres',
    managers: 'Managers',
    questions: 'Questions',
    templates: 'Templates',
    sessions: 'Sessions',
    completion: 'Complétion',
  },
  languages: {
    title: 'Gestion des langues',
    addLanguage: 'Ajouter une langue',
    code: 'Code',
    name: 'Nom',
    active: 'Active',
    editLanguage: 'Modifier la langue',
    deleteConfirm: 'Supprimer cette langue ?',
    actions: 'Actions',
  },
  joinRequests: {
    title: 'Demandes d\'accès',
    user: 'Utilisateur',
    email: 'Email',
    requestedAt: 'Date de demande',
    status: 'Statut',
    actions: 'Actions',
    approve: 'Approuver',
    reject: 'Rejeter',
    rejectReason: 'Motif du refus',
    rejectReasonPlaceholder: 'Motif optionnel...',
    pending: 'En attente',
    approved: 'Approuvé',
    rejected: 'Refusé',
    cancelled: 'Annulé',
    all: 'Tous',
    noRequests: 'Aucune demande',
  },
},
```

Add EN values (same structure, English text). Add NL values (same structure, Dutch text). For IT and ES, copy EN as a placeholder — the user can translate later.

- [ ] **Step 2.2: Typecheck**

```bash
cd quizonline-frontend && npx --no-install tsc --noEmit -p tsconfig.app.json
```

Expected: zero errors.

- [ ] **Step 2.3: Commit**

```bash
git add quizonline-frontend/src/app/shared/i18n/ui-text.ts
git commit -m "feat(i18n): add admin page labels (stats, languages, join requests) in FR/EN/NL"
```

---

## Task 3: Stats frontend service + dashboard page

**Files:**
- Create: `quizonline-frontend/src/app/services/stats/stats.ts`
- Create: `quizonline-frontend/src/app/pages/admin/stats/stats-dashboard.ts`
- Create: `quizonline-frontend/src/app/pages/admin/stats/stats-dashboard.html`

- [ ] **Step 3.1: Create the StatsService**

Create `quizonline-frontend/src/app/services/stats/stats.ts`:

```typescript
import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';

export interface DomainStats {
  id: number;
  translations: Record<string, {name: string}>;
  members_count: number;
  managers_count: number;
  questions_count: number;
  templates_count: number;
  sessions_total: number;
  sessions_completed: number;
}

export interface DashboardStats {
  totals: {
    active_users: number;
    active_domains: number;
    active_questions: number;
    completed_sessions: number;
  };
  domains: DomainStats[];
}

@Injectable({providedIn: 'root'})
export class StatsService {
  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api`;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiBaseUrl}/stats/dashboard/`);
  }
}
```

- [ ] **Step 3.2: Create the stats dashboard page**

Create `quizonline-frontend/src/app/pages/admin/stats/stats-dashboard.html`:

```html
<div class="p-4">
  <h1>{{ ui.admin.stats.title }}</h1>

  <!-- KPI Cards -->
  <div class="grid mb-4" *ngIf="stats">
    <div class="col-6 md:col-3" *ngFor="let card of kpiCards">
      <p-card>
        <div class="text-center">
          <i [class]="card.icon + ' text-4xl mb-2'" [style.color]="card.color"></i>
          <div class="text-3xl font-bold">{{ card.value }}</div>
          <div class="text-500">{{ card.label }}</div>
        </div>
      </p-card>
    </div>
  </div>

  <!-- Domain breakdown table -->
  <p-table
    [value]="stats?.domains ?? []"
    [sortField]="'members_count'"
    [sortOrder]="-1"
    styleClass="p-datatable-sm"
    [paginator]="true"
    [rows]="20"
  >
    <ng-template pTemplate="header">
      <tr>
        <th pSortableColumn="name">{{ ui.admin.stats.domain }} <p-sortIcon field="name" /></th>
        <th pSortableColumn="members_count">{{ ui.admin.stats.members }} <p-sortIcon field="members_count" /></th>
        <th pSortableColumn="managers_count">{{ ui.admin.stats.managers }} <p-sortIcon field="managers_count" /></th>
        <th pSortableColumn="questions_count">{{ ui.admin.stats.questions }} <p-sortIcon field="questions_count" /></th>
        <th pSortableColumn="templates_count">{{ ui.admin.stats.templates }} <p-sortIcon field="templates_count" /></th>
        <th pSortableColumn="sessions_total">{{ ui.admin.stats.sessions }} <p-sortIcon field="sessions_total" /></th>
        <th>{{ ui.admin.stats.completion }}</th>
      </tr>
    </ng-template>
    <ng-template pTemplate="body" let-domain>
      <tr>
        <td>{{ domainName(domain) }}</td>
        <td>{{ domain.members_count }}</td>
        <td>{{ domain.managers_count }}</td>
        <td>{{ domain.questions_count }}</td>
        <td>{{ domain.templates_count }}</td>
        <td>{{ domain.sessions_total }}</td>
        <td>
          <p-progressBar
            [value]="completionRate(domain)"
            [showValue]="true"
            [style]="{height: '20px'}"
          />
        </td>
      </tr>
    </ng-template>
    <ng-template pTemplate="emptymessage">
      <tr><td colspan="7" class="text-center text-500">Aucun domaine</td></tr>
    </ng-template>
  </p-table>
</div>
```

Create `quizonline-frontend/src/app/pages/admin/stats/stats-dashboard.ts`:

```typescript
import {Component, inject, OnInit, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {CardModule} from 'primeng/card';
import {TableModule} from 'primeng/table';
import {ProgressBarModule} from 'primeng/progressbar';
import {SortIconModule} from 'primeng/sorticon'; // check if this exists; if not, it's bundled in TableModule

import {DashboardStats, DomainStats, StatsService} from '../../../services/stats/stats';
import {UserService} from '../../../services/user/user';
import {getUiText, UiText} from '../../../shared/i18n/ui-text';

@Component({
  selector: 'app-stats-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule, TableModule, ProgressBarModule],
  templateUrl: './stats-dashboard.html',
})
export class StatsDashboardPage implements OnInit {
  private readonly statsService = inject(StatsService);
  private readonly userService = inject(UserService);

  stats: DashboardStats | null = null;
  ui: UiText = getUiText(this.userService.currentLang);

  kpiCards: {icon: string; color: string; value: number; label: string}[] = [];

  ngOnInit(): void {
    this.ui = getUiText(this.userService.currentLang);
    this.statsService.getDashboard().subscribe({
      next: (data) => {
        this.stats = data;
        this.kpiCards = [
          {icon: 'pi pi-users', color: '#3B82F6', value: data.totals.active_users, label: this.ui.admin.stats.activeUsers},
          {icon: 'pi pi-globe', color: '#10B981', value: data.totals.active_domains, label: this.ui.admin.stats.activeDomains},
          {icon: 'pi pi-question-circle', color: '#F59E0B', value: data.totals.active_questions, label: this.ui.admin.stats.activeQuestions},
          {icon: 'pi pi-check-square', color: '#8B5CF6', value: data.totals.completed_sessions, label: this.ui.admin.stats.completedSessions},
        ];
      },
      error: (err) => console.error('stats dashboard load failed', err),
    });
  }

  domainName(domain: DomainStats): string {
    const lang = this.userService.currentLang;
    return domain.translations[lang]?.name
      || domain.translations['fr']?.name
      || domain.translations['en']?.name
      || Object.values(domain.translations)[0]?.name
      || `Domain #${domain.id}`;
  }

  completionRate(domain: DomainStats): number {
    if (!domain.sessions_total) return 0;
    return Math.round((domain.sessions_completed / domain.sessions_total) * 100);
  }
}
```

- [ ] **Step 3.3: Typecheck**

```bash
cd quizonline-frontend && npx --no-install tsc --noEmit -p tsconfig.app.json
```

Expected: zero errors (the component is not yet routed but should compile).

- [ ] **Step 3.4: Commit**

```bash
git add quizonline-frontend/src/app/services/stats/ quizonline-frontend/src/app/pages/admin/stats/
git commit -m "feat(stats): add stats dashboard page with KPI cards and domain table"
```

---

## Task 4: Language management page

**Files:**
- Create: `quizonline-frontend/src/app/pages/admin/languages/language-management.ts`
- Create: `quizonline-frontend/src/app/pages/admin/languages/language-management.html`

- [ ] **Step 4.1: Create the language management page**

Create the HTML template and TypeScript component. The page uses:
- `p-table` for the language list
- `p-dialog` for create/edit
- `p-inputSwitch` for the active toggle (inline PATCH)
- `p-confirmDialog` for delete confirmation
- The existing `LanguageService` (wraps `LanguageApi`)

The component:
- On init, loads languages via `languageService.list()`
- Create: opens dialog, on submit calls `languageService.create(payload)`, refreshes table
- Edit: opens dialog pre-filled, on submit calls `languageService.update(id, payload)`, refreshes table
- Delete: shows confirm dialog, calls `languageService.delete(id)`, refreshes table
- Active toggle: calls `languageService.patch(id, {active: value})`, no dialog

Follow the existing page patterns (e.g., `domain-list.ts`, `question-list.ts`) for the component structure: `@Component` with standalone imports, `inject()` for services, `signal()` for reactive state.

- [ ] **Step 4.2: Typecheck**

```bash
cd quizonline-frontend && npx --no-install tsc --noEmit -p tsconfig.app.json
```

- [ ] **Step 4.3: Commit**

```bash
git add quizonline-frontend/src/app/pages/admin/languages/
git commit -m "feat(admin): add language management page with CRUD + inline active toggle"
```

---

## Task 5: Join requests page

**Files:**
- Create: `quizonline-frontend/src/app/pages/domain/join-requests/domain-join-requests.ts`
- Create: `quizonline-frontend/src/app/pages/domain/join-requests/domain-join-requests.html`

- [ ] **Step 5.1: Create the join requests page**

The page uses:
- `ActivatedRoute` to read `domainId` from the URL params
- `DomainService` to fetch the domain detail (for the header name) and list join requests
- `p-selectButton` for status filter (Pending / Approved / Rejected / All)
- `p-table` for the requests list
- `p-tag` for status display (colored: pending=warning, approved=success, rejected=danger, cancelled=info)
- `p-dialog` for reject reason input
- Approve button calls `domainService.domainJoinRequestApproveCreate({domainId, reqId})`
- Reject button opens dialog, on submit calls `domainService.domainJoinRequestRejectCreate({domainId, reqId})` with the reason

The component:
- On init, reads `domainId` from route params, loads the domain detail + join requests
- Status filter changes trigger a re-fetch with `?status=` query param
- After approve/reject, refresh the list

- [ ] **Step 5.2: Typecheck**

```bash
cd quizonline-frontend && npx --no-install tsc --noEmit -p tsconfig.app.json
```

- [ ] **Step 5.3: Commit**

```bash
git add quizonline-frontend/src/app/pages/domain/join-requests/
git commit -m "feat(domain): add join requests dashboard page with approve/reject actions"
```

---

## Task 6: Domain list badge + routes + topmenu admin dropdown

**Files:**
- Modify: `quizonline-frontend/src/app/app.routes.ts`
- Modify: `quizonline-frontend/src/app/components/topmenu/topmenu.ts`
- Modify: `quizonline-frontend/src/app/components/topmenu/topmenu.html`
- Modify: `quizonline-frontend/src/app/pages/domain/list/domain-list.ts`
- Modify: `quizonline-frontend/src/app/pages/domain/list/domain-list.html`

- [ ] **Step 6.1: Add the 3 routes in app.routes.ts**

Add to the routes array in `quizonline-frontend/src/app/app.routes.ts`:

```typescript
{
  path: 'admin/stats',
  loadComponent: () => import('./pages/admin/stats/stats-dashboard').then(m => m.StatsDashboardPage),
  canActivate: [authGuard, staffGuard],
},
{
  path: 'admin/languages',
  loadComponent: () => import('./pages/admin/languages/language-management').then(m => m.LanguageManagementPage),
  canActivate: [authGuard, superuserGuard],
},
{
  path: 'domain/:domainId/join-requests',
  loadComponent: () => import('./pages/domain/join-requests/domain-join-requests').then(m => m.DomainJoinRequestsPage),
  canActivate: [authGuard, staffGuard],
},
```

- [ ] **Step 6.2: Add Admin dropdown in topmenu**

In `topmenu.ts`, add a computed property or method that returns the admin menu items based on the user's role:

```typescript
adminMenuItems = computed(() => {
  const items: {label: string; icon: string; routerLink: string}[] = [];
  items.push({label: this.ui().admin.stats.title, icon: 'pi pi-chart-bar', routerLink: '/admin/stats'});
  if (this.userService.isSuperuser()) {
    items.push({label: this.ui().admin.languages.title, icon: 'pi pi-language', routerLink: '/admin/languages'});
  }
  return items;
});
```

In `topmenu.html`, add the Admin dropdown (visible only when `userService.isAdmin()`). Use `p-menu` or a `p-button` with a `p-tieredMenu`. Follow the existing dropdown pattern in the topmenu (the user/domain selector dropdowns are good references).

- [ ] **Step 6.3: Add join requests badge to domain list**

In `domain-list.html`, add a new column in the domain table:

```html
<th>{{ ui().admin.joinRequests.title }}</th>
```

And in the body:

```html
<td>
  <a *ngIf="domain.pending_join_requests_count != null && domain.pending_join_requests_count > 0"
     [routerLink]="['/domain', domain.id, 'join-requests']"
     class="p-badge p-badge-warning">
    {{ domain.pending_join_requests_count }}
  </a>
  <span *ngIf="domain.pending_join_requests_count === 0">—</span>
</td>
```

In `domain-list.ts`, add `RouterModule` (or `RouterLink`) to the component imports if not already there.

- [ ] **Step 6.4: Typecheck + unit tests**

```bash
cd quizonline-frontend && npx --no-install tsc --noEmit -p tsconfig.app.json
cd quizonline-frontend && npm test
```

Expected: zero errors, all tests pass.

- [ ] **Step 6.5: Commit**

```bash
git add quizonline-frontend/src/app/app.routes.ts quizonline-frontend/src/app/components/topmenu/ quizonline-frontend/src/app/pages/domain/list/
git commit -m "feat(admin): wire routes, topmenu dropdown, and domain list join-request badge"
```

---

## Task 7: OpenAPI regen + final verification

**Files:**
- Modify: `quizonline-server/openapi.yaml`
- Modify: `quizonline-frontend/openapi.yaml`
- Modify: `quizonline-frontend/src/app/api/generated/` (regenerated)

- [ ] **Step 7.1: Regenerate OpenAPI**

```bash
cd D:/PycharmProjects/QuizOnline && powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sync-openapi.ps1
```

- [ ] **Step 7.2: Typecheck after regen**

```bash
cd quizonline-frontend && npx --no-install tsc --noEmit -p tsconfig.app.json
```

If the regen changed type names, fix any broken imports.

- [ ] **Step 7.3: Full backend test suite**

```bash
cd quizonline-server && ../.venv/Scripts/python.exe manage.py test
```

- [ ] **Step 7.4: Frontend unit tests**

```bash
cd quizonline-frontend && npm test
```

- [ ] **Step 7.5: Commit**

```bash
git add quizonline-server/openapi.yaml quizonline-frontend/openapi.yaml quizonline-frontend/src/app/api/generated/
git commit -m "chore: regenerate OpenAPI schema and Angular client for stats endpoint"
```

---

## Self-review

| Spec requirement | Task |
|-----------------|------|
| Stats backend endpoint with domain scoping | Task 1 |
| Stats KPI cards + domain table | Task 3 |
| Language CRUD page (superuser only) | Task 4 |
| Join requests page with approve/reject | Task 5 |
| Domain list badge column | Task 6 |
| Admin dropdown in topmenu | Task 6 |
| superuserGuard | Already exists |
| staffGuard | Already exists |
| i18n (FR/EN/NL) | Task 2 |
| Routes (3 new) | Task 6 |
| OpenAPI regen | Task 7 |
| translations dict for domain names | Tasks 1 (backend) + 3 (frontend resolver) |
