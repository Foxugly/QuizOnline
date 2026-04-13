# Admin Pages — Design Spec

**Status:** Draft, awaiting review
**Author:** brainstorming session 2026-04-13
**Scope:** 3 new Angular pages + 1 new backend endpoint + navigation changes

## Goal

Add three admin pages to the frontend so superusers and domain managers can manage join requests, platform languages, and view usage statistics — all without touching the Django admin or the server shell.

## Pages

### Page 1: Join Requests Dashboard

**Route:** `/domain/:domainId/join-requests`
**Guards:** `authGuard + staffGuard`
**Access:** Domain owners and managers of the specific domain (same permission as the API's `CanApproveJoinRequest`)

**Entry point:** In the `/domain/list` page, add a "Demandes" column to the domain table with a clickable badge showing `pending_join_requests_count` (already in `DomainReadSerializer`). The badge links to `/domain/:domainId/join-requests`.

**Component:** `DomainJoinRequestsPage` (standalone, lazy-loaded)

**Layout:**
- Header: domain name (localized from translations) + pending count badge
- Status filter: `p-selectButton` with options `Pending | Approved | Rejected | All`. Maps to the existing `?status=` API query parameter.
- Table (`p-table`):
  - Columns: `Utilisateur | Email | Date de demande | Statut | Actions`
  - Data source: `GET /api/domain/{domainId}/join-request/?status=...`
  - Pending rows: `Approuver` (green button) + `Rejeter` (red button, opens a `p-dialog` for optional reason text)
  - Non-pending rows: colored `p-tag` showing the status, no action buttons
- Approve action: `POST /api/domain/{domainId}/join-request/{reqId}/approve/`
- Reject action: `POST /api/domain/{domainId}/join-request/{reqId}/reject/` with `{reason: "..."}`
- After each action: refresh the table and update the badge count

**Backend:** All endpoints exist (Tasks 6-9). No new backend work.

**Frontend service:** Create a new `JoinRequestService` in `services/join-request/join-request.ts` that wraps the generated `DomainApi` methods for join-request operations. Alternatively, extend the existing `DomainService` — whichever matches the existing pattern best.

---

### Page 2: Languages Management

**Route:** `/admin/languages`
**Guards:** `authGuard + superuserGuard` (NEW guard — see below)
**Access:** Superusers only

**New guard:** `superuserGuard` in `guards/superuser.guard.ts`. Checks `userService.currentUser()?.is_superuser === true`. Redirects to `/home` if not. This is distinct from `staffGuard` which allows domain managers.

**Component:** `LanguageManagementPage` (standalone, lazy-loaded)

**Layout:**
- Header: "Gestion des langues"
- "Ajouter une langue" button (top-right) → opens create dialog
- Table (`p-table`):
  - Columns: `Code | Nom | Active | Actions`
  - Data source: `GET /api/lang/`
  - Active column: inline `p-inputSwitch` that PATCHes `{active: true/false}` on toggle
  - Actions: `Éditer` (pencil icon → opens edit dialog) + `Supprimer` (trash icon → confirmation dialog)
- Create/Edit dialog (`p-dialog`):
  - Fields: `code` (text input, 2-10 chars) + `name` (text input) + `active` (checkbox)
  - Create: `POST /api/lang/`
  - Edit: `PUT /api/lang/{langId}/`
- Delete: `DELETE /api/lang/{langId}/` with confirmation

**Backend:** The `/api/lang/` CRUD API exists. No new backend work.

**Frontend service:** `LanguageService` already exists and wraps `LanguageApi`.

---

### Page 3: Stats Dashboard

**Route:** `/admin/stats`
**Guards:** `authGuard + staffGuard`
**Access:** Superusers see all stats; staff sees stats scoped to their owned/managed domains

**Component:** `StatsDashboardPage` (standalone, lazy-loaded)

**Layout:**

**Part A — KPI cards** (4 `p-card` in a row):
- Active users (icon: `pi pi-users`)
- Active domains (icon: `pi pi-globe`)
- Active questions (icon: `pi pi-question-circle`)
- Completed sessions (icon: `pi pi-check-square`)

For non-superuser staff, these counts are scoped to their domains.

**Part B — Domain breakdown table** (`p-table`, sortable):
- Columns: `Domaine | Membres | Managers | Questions | Templates | Sessions | Complétion`
- Domain name: resolved from `translations` dict using the user's current language (same pattern as domain list page)
- Completion column: `p-progressBar` showing `sessions_completed / sessions_total` as percentage
- Non-superuser staff sees only their owned/managed domains

**Backend:** NEW endpoint required.

**Endpoint:** `GET /api/stats/dashboard/`
**Location:** `config/stats_views.py` (no new Django app — just a view + URL registration in `config/api_urls.py`)
**Permission:** `IsAdminUser` (= `is_staff`). Scoping in the view body.
**Serializer:** None (the view returns a manually constructed dict via `Response(...)`)

**Response shape:**
```json
{
  "totals": {
    "active_users": 42,
    "active_domains": 3,
    "active_questions": 156,
    "completed_sessions": 89
  },
  "domains": [
    {
      "id": 1,
      "translations": {
        "fr": {"name": "Sciences"},
        "en": {"name": "Science"}
      },
      "members_count": 12,
      "managers_count": 2,
      "questions_count": 45,
      "templates_count": 3,
      "sessions_total": 30,
      "sessions_completed": 24
    }
  ]
}
```

**Query strategy:** Use Django `annotate()` + `aggregate()` on a single queryset to avoid N+1. Domain-level counts use `Count()` with filters. Global totals use a separate `aggregate()` call. For non-superuser staff, the base queryset is filtered by `Q(owner=user) | Q(managers=user)`, and user counts are scoped to users who are members of those domains.

**Frontend service:** New `StatsService` in `services/stats/stats.ts` with a single `getDashboard()` method.

---

## Navigation Changes

**Topmenu:** Add an "Admin" dropdown (`p-menu` or `p-tieredMenu`) visible only when `userService.isAdmin()` returns true (= `is_staff` or `is_superuser`). Contains:
- "Statistiques" → `/admin/stats` (visible to all staff)
- "Langues" → `/admin/languages` (visible only to superusers — hide the menu item, not just the guard)

The dropdown sits after the existing nav links and before the user/domain selectors.

**Domain list page:** Add a "Demandes" column in the existing domain table. Shows `pending_join_requests_count` as a clickable badge. Links to `/domain/:domainId/join-requests`. The badge is hidden (or shows "—") when the count is null (= user can't approve).

---

## Multilingual

All user-facing text (labels, button text, column headers, messages) must go through the existing `UiText` i18n system (`shared/i18n/ui-text.ts`). Add entries for `fr`, `en`, `nl` at minimum. Domain names are resolved from the `translations` dict using `user.currentLang` (same as every other page in the app).

---

## New files (preview)

| File | Type |
|------|------|
| `quizonline-frontend/src/app/guards/superuser.guard.ts` | New guard |
| `quizonline-frontend/src/app/pages/domain/join-requests/domain-join-requests.ts` | New page |
| `quizonline-frontend/src/app/pages/admin/languages/language-management.ts` | New page |
| `quizonline-frontend/src/app/pages/admin/stats/stats-dashboard.ts` | New page |
| `quizonline-frontend/src/app/services/stats/stats.ts` | New service |
| `quizonline-server/config/stats_views.py` | New view |
| `quizonline-frontend/src/app/app.routes.ts` | Modified (3 new routes) |
| `quizonline-frontend/src/app/components/topmenu/topmenu.ts` | Modified (Admin dropdown) |
| `quizonline-frontend/src/app/pages/domain/list/domain-list.ts` | Modified (join requests badge column) |
| `quizonline-server/config/api_urls.py` | Modified (stats endpoint) |
| `quizonline-frontend/src/app/shared/i18n/ui-text.ts` | Modified (new i18n keys) |

## Non-goals (v1)

- Real-time updates (WebSocket/polling) on the join requests page
- CSV/PDF export of stats
- Graphs/charts (just cards + table for now)
- Date-range filtering on stats
- Audit log page (who approved/rejected what, when)
