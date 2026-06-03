# Connection Activity Log — design spec

**Date:** 2026-06-03
**Status:** Approved (owner), ready for implementation plan.

## Goal

Give superusers a security/supervision view of **login activity across all users**: a
superuser-only admin page that lists every successful login (with device + geolocation
context), filterable by date range, shown both as a **list** (with a per-row details
popup) and on a **map**.

## Confirmed decisions (from brainstorming)

1. **Scope:** journal of **all** users' logins (admin oversight tool). Superuser sees everyone.
2. **Geolocation:** **MaxMind GeoLite2 local DB** — offline lookup, no per-request external
   call, user IPs never leave our infra (best GDPR posture).
3. **Trigger:** one event per **successful login** — password login **and** magic-link.
4. **Retention:** **unlimited / no auto-purge** (owner's explicit decision). The data is
   personal (IP, geo, account, device); the model is kept purge-friendly so a retention
   job can be added later, but none ships now.

## Architecture (three layers)

### 1. Capture (frontend → backend, on login)
Some fields are only knowable in the browser, so capture needs a dedicated authenticated
endpoint the SPA calls right after a successful login:
- **Frontend** (after password login AND magic-link exchange succeed): fire-and-forget
  `POST /api/connection-log/` with the client context — local time + UTC offset,
  `navigator.language`, IANA timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`),
  `screen.width` × `screen.height`, `navigator.onLine`. Errors are swallowed (never block
  or fail login).
- **Backend** fills the server-known fields: client **IP** (reuse the existing
  `X-Forwarded-For` helper in `domain/view_mixins/_helpers.py`), **user-agent** → approximate
  **browser**/**OS** (via the `user-agents` lib), the authenticated **account**, the
  **login method**, and the **geolocation** (see layer 2).

### 2. Geolocation — MaxMind GeoLite2, local
- Synchronous, offline lookup via the `geoip2` library through Django's
  `django.contrib.gis.geoip2.GeoIP2` wrapper (no GIS database needed — it only reads the
  `.mmdb` file), pointed at `GeoLite2-City.mmdb` via `GEOIP_PATH`.
- Yields: country, country code, city, region, **latitude**, **longitude** (the last two
  drive the map).
- **Graceful degradation:** if the DB file is missing/unreadable or the IP is private/not
  found, geo fields are left null and the event is still stored — capture never fails on geo.

### 3. Persistence — `ConnectionEvent` model (new flat app `connectionlog/`)
Fields:
- `user` (FK `CustomUser`, `on_delete=SET_NULL`, nullable) + `account_email` (snapshot string,
  so a deleted user still reads meaningfully).
- `created_at` (`auto_now_add`, `db_index=True`) — server timestamp, the date-range axis.
- `login_method` (`password` | `magic_link`).
- `ip` (`GenericIPAddressField`, nullable).
- `user_agent` (text), `browser` (char), `os` (char).
- Client-captured: `local_time` (char — the client's reported local datetime + offset),
  `browser_language` (char), `timezone` (char, IANA), `screen_width` (int), `screen_height`
  (int), `online` (bool, nullable).
- Geo: `country` (char), `country_code` (char), `city` (char), `region` (char),
  `latitude` (float, nullable), `longitude` (float, nullable).
- `Meta.ordering = ["-created_at"]`, index on `created_at` (and `(user, created_at)`).

## API (`config/api_urls.py`)

- `POST /api/connection-log/` — `IsAuthenticated`. Records the caller's own login event.
  Throttled with a dedicated `ScopedRateThrottle` scope (`connection_log`, env-overridable
  via `THROTTLE_*`, per project convention). Request body = the client-context fields;
  server overrides/derives IP, UA, account, geo, timestamp (client cannot spoof those).
- `GET /api/connection-log/?start=<ISO>&end=<ISO>` — `IsSuperUser`. Paginated list of all
  events in the window, ordered newest-first, including geo + all fields. `start`/`end`
  optional (default = all). Used by both the list and the map.

Serializers: a write serializer (client fields only) and a read serializer (full record).
ViewSet: create (auth) + list (superuser) with date-range filtering (DjangoFilterBackend or
explicit query-param parsing).

## Frontend

- **Capture:** in the auth flow (login component + magic-link handler), after a successful
  token obtain, call a small `ConnectionLogService.record(clientContext)` — fire-and-forget.
- **Admin link:** add an entry to the existing superuser **admin menu** (`topmenu`,
  gated by `is_superuser`) → route `/admin/connections`, protected by the existing
  `superuserGuard`.
- **Page** (`pages/admin/connections/` or similar):
  - **Date-range filter** (PrimeNG `p-datepicker` range) driving the list + map queries.
  - **List** (`p-table`): columns date (`| relativeDate` + title absolute), account, IP,
    country/city, browser/OS. Per-row **details button** → `p-dialog` popup showing every field.
  - **Map** (Leaflet + OpenStreetMap tiles): one marker per event with lat/lon; marker popup
    shows account + city + time; marker clustering when there are many points.
  - **Empty state** via `<app-empty-state>`; loading skeletons per existing patterns.
- **New dependency:** `leaflet` (+ `@types/leaflet`). OSM raster tiles, no API key.
- **i18n:** a page-scoped dictionary (FR/EN/NL/IT/ES), registered in
  `quizonline-frontend/scripts/check-i18n.ts`.

## Deployment

- **MaxMind GeoLite2:** requires a free MaxMind account + license key. `GeoLite2-City.mmdb`
  (~60 MB) is **not committed** (add to `.gitignore`); it is fetched/updated on the server
  (`geoipupdate`, or a direct download in a deploy step). License key stored in SSM
  (`/quizonline/prod/MAXMIND_LICENSE_KEY`); `GEOIP_PATH` points at the DB directory (env/SSM).
  Document the procedure in `deploy/` (new section + note in the env example).
- **Backend deps:** add `geoip2` and `user-agents` to `requirements.txt`.
- **Migration:** a normal new-table migration for `ConnectionEvent`.
- **OpenAPI:** regenerate the Angular client in the same commit as the new endpoints.
- **Throttle scope:** add `connection_log` default + `THROTTLE_CONNECTION_LOG` override
  (and seed via SSM like the other LMS throttles).

## GDPR note

Connection events are personal data (IP, approximate location, account, device). Retention
is **unlimited per the owner's explicit choice**; this should be reflected in the privacy
policy and justified by a legitimate-interest basis (account security). The model is designed
so a scheduled purge (Celery beat) can be added later without schema change. Geolocation is
done locally (MaxMind) precisely so user IPs are not shared with a third party.

## Out of scope (non-goals)

- Real-time presence / "currently online" heartbeat (trigger is login only).
- Logging session resume / token refresh / page loads (login events only).
- Failed-login / brute-force tracking (could be a future extension).
- Auto-purge / retention enforcement (deferred, owner chose unlimited).

## Testing

- Backend: capture endpoint stores derived server fields and ignores client-spoofed
  server fields; geo degrades gracefully when the DB is absent; list endpoint is
  superuser-only and respects the date range. UA parsing maps a couple of known agents.
- Frontend: capture service posts the right client context and never throws; the admin
  page renders list + map + popup; superuser route guard.
