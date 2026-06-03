# Connection Activity Log — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A superuser-only admin page that lists every successful login (device + geolocation context) across all users, filterable by date range, shown as a list (with a per-row details popup) and on a map.

**Architecture:** New flat Django app `connectionlog` with a `ConnectionEvent` model. The SPA fires `POST /api/connection-log/` after each successful login with browser-only context; the backend enriches with IP, user-agent → browser/OS, account, and offline MaxMind GeoLite2 geolocation, then stores it. A superuser `GET /api/connection-log/?start=&end=` feeds an Angular admin page (PrimeNG table + dialog + Leaflet map).

**Tech Stack:** Django 6 / DRF, `geoip2` (MaxMind GeoLite2 local `.mmdb`), `user-agents`; Angular 21 / PrimeNG 21, `leaflet`.

**Spec:** `docs/superpowers/specs/2026-06-03-connection-activity-log-design.md`

---

## File structure

**Backend (new app `quizonline-server/connectionlog/`):**
- `models.py` — `ConnectionEvent`.
- `geoip.py` — `lookup_geo(ip) -> dict` (MaxMind, graceful degradation).
- `useragent.py` — `parse_user_agent(ua) -> {browser, os}`.
- `serializers.py` — `ConnectionEventWriteSerializer`, `ConnectionEventReadSerializer`.
- `views.py` — `ConnectionEventViewSet` (create=auth, list=superuser, date-range).
- `services.py` — `record_connection(*, user, request, client)` (enrich + save).
- `api_urls.py` — router.
- `apps.py`, `__init__.py`, `migrations/`.
- `tests/` — `test_capture.py`, `test_list_permissions.py`, `test_geoip.py`, `test_useragent.py`.

**Backend (modify):**
- `config/settings_base.py` — add app, `GEOIP_PATH`, throttle scope/rate.
- `config/api_urls.py` — mount `connection-log/`.
- `requirements.txt` — `geoip2`, `user-agents`.
- `.gitignore` — ignore `*.mmdb`.

**Frontend (new):**
- `services/connection-log/connection-log.service.ts` — `record()` + `list()`.
- `pages/admin/connections/connections.ts` / `.html` / `.scss` / `.i18n.ts` — the page.
- map handled inside the page via `leaflet`.

**Frontend (modify):**
- the auth flow (login component + magic-link handler) — call `record()` post-login.
- `app.routes.ts` — `/admin/connections` route under `superuserGuard`.
- `components/topmenu/topmenu.*` — admin-menu link (gated `is_superuser`).
- `scripts/check-i18n.ts` — register the new page dict.
- `package.json` — `leaflet` + `@types/leaflet`.

---

## PHASE A — Backend

### Task A1: Scaffold the app + model

**Files:**
- Create: `quizonline-server/connectionlog/__init__.py` (empty), `apps.py`, `models.py`
- Test: `quizonline-server/connectionlog/tests/__init__.py` (empty), `quizonline-server/connectionlog/tests/test_models.py`
- Modify: `quizonline-server/config/settings_base.py` (INSTALLED_APPS)

- [ ] **Step 1: Write the failing test**

```python
# connectionlog/tests/test_models.py
import pytest
from django.contrib.auth import get_user_model
from connectionlog.models import ConnectionEvent


@pytest.mark.django_db
def test_connection_event_minimal_create():
    user = get_user_model().objects.create(email="a@b.com", username="a@b.com")
    ev = ConnectionEvent.objects.create(
        user=user, account_email="a@b.com", login_method="password", ip="1.2.3.4",
    )
    assert ev.pk is not None
    assert ev.created_at is not None
    # deleting the user keeps the row (SET_NULL) + the email snapshot
    user.delete()
    ev.refresh_from_db()
    assert ev.user is None
    assert ev.account_email == "a@b.com"
```

- [ ] **Step 2: Run it, verify it fails**

Run: `cd quizonline-server && python -m pytest connectionlog/tests/test_models.py -q`
Expected: FAIL (`ModuleNotFoundError: connectionlog`).

- [ ] **Step 3: Create the app**

```python
# connectionlog/apps.py
from django.apps import AppConfig


class ConnectionLogConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "connectionlog"
```

```python
# connectionlog/models.py
from django.conf import settings
from django.db import models


class ConnectionEvent(models.Model):
    PASSWORD = "password"
    MAGIC_LINK = "magic_link"
    LOGIN_METHOD_CHOICES = [(PASSWORD, "Password"), (MAGIC_LINK, "Magic link")]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="connection_events",
    )
    account_email = models.CharField(max_length=254, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    login_method = models.CharField(max_length=20, choices=LOGIN_METHOD_CHOICES, default=PASSWORD)

    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    browser = models.CharField(max_length=120, blank=True)
    os = models.CharField(max_length=120, blank=True)

    # browser-captured
    local_time = models.CharField(max_length=64, blank=True)
    browser_language = models.CharField(max_length=64, blank=True)
    timezone = models.CharField(max_length=64, blank=True)
    screen_width = models.PositiveIntegerField(null=True, blank=True)
    screen_height = models.PositiveIntegerField(null=True, blank=True)
    online = models.BooleanField(null=True, blank=True)

    # geo (MaxMind)
    country = models.CharField(max_length=120, blank=True)
    country_code = models.CharField(max_length=2, blank=True)
    city = models.CharField(max_length=180, blank=True)
    region = models.CharField(max_length=180, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "created_at"], name="connlog_user_created_idx")]

    def __str__(self):
        return f"{self.account_email} @ {self.created_at:%Y-%m-%d %H:%M} ({self.ip})"
```

Add `"connectionlog",` to `INSTALLED_APPS` in `config/settings_base.py` (in the local-apps group, near the other flat apps like `course`, `lesson`).

- [ ] **Step 4: Make + run migration, run test**

Run:
```
cd quizonline-server
python manage.py makemigrations connectionlog
python -m pytest connectionlog/tests/test_models.py -q
```
Expected: migration `0001_initial` created; test PASS.

- [ ] **Step 5: Commit**

```bash
git add quizonline-server/connectionlog/ quizonline-server/config/settings_base.py
git commit -m "feat(connectionlog): ConnectionEvent model + app scaffold"
```

### Task A2: User-agent parsing

**Files:**
- Create: `quizonline-server/connectionlog/useragent.py`
- Modify: `quizonline-server/requirements.txt` (add `user-agents`)
- Test: `quizonline-server/connectionlog/tests/test_useragent.py`

- [ ] **Step 1: Add dep + install**

Add `user-agents==2.2.0` to `requirements.txt`. Run `cd quizonline-server && pip install user-agents==2.2.0`.

- [ ] **Step 2: Write the failing test**

```python
# connectionlog/tests/test_useragent.py
from connectionlog.useragent import parse_user_agent


def test_parse_chrome_on_windows():
    ua = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
          "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
    out = parse_user_agent(ua)
    assert "Chrome" in out["browser"]
    assert "Windows" in out["os"]


def test_parse_empty():
    assert parse_user_agent("") == {"browser": "", "os": ""}
```

- [ ] **Step 3: Run, verify fail**

Run: `python -m pytest connectionlog/tests/test_useragent.py -q` → FAIL (module missing).

- [ ] **Step 4: Implement**

```python
# connectionlog/useragent.py
from user_agents import parse as _parse


def parse_user_agent(ua_string: str) -> dict:
    """Approximate browser + OS from a User-Agent string. Best-effort:
    returns empty strings on a blank/unknown UA."""
    if not ua_string:
        return {"browser": "", "os": ""}
    ua = _parse(ua_string)
    browser = ua.browser.family or ""
    if ua.browser.version_string:
        browser = f"{browser} {ua.browser.version_string}".strip()
    os = ua.os.family or ""
    if ua.os.version_string:
        os = f"{os} {ua.os.version_string}".strip()
    return {"browser": browser[:120], "os": os[:120]}
```

- [ ] **Step 5: Run, verify pass; commit**

```bash
python -m pytest connectionlog/tests/test_useragent.py -q
git add quizonline-server/connectionlog/useragent.py quizonline-server/connectionlog/tests/test_useragent.py quizonline-server/requirements.txt
git commit -m "feat(connectionlog): approximate browser/OS from user-agent"
```

### Task A3: MaxMind geolocation (graceful)

**Files:**
- Create: `quizonline-server/connectionlog/geoip.py`
- Modify: `quizonline-server/requirements.txt` (add `geoip2`), `config/settings_base.py` (`GEOIP_PATH`)
- Test: `quizonline-server/connectionlog/tests/test_geoip.py`

- [ ] **Step 1: Add dep**

Add `geoip2==4.8.0` to `requirements.txt`; `pip install geoip2==4.8.0`.

- [ ] **Step 2: Settings**

In `config/settings_base.py`, add to the `env` schema block: `GEOIP_PATH=(str, "")` and below the env reads add `GEOIP_PATH = env("GEOIP_PATH")` (a directory containing `GeoLite2-City.mmdb`). Empty = geo disabled.

- [ ] **Step 3: Write the failing test**

```python
# connectionlog/tests/test_geoip.py
from connectionlog import geoip


def test_geo_disabled_when_no_db(settings):
    settings.GEOIP_PATH = ""
    assert geoip.lookup_geo("8.8.8.8") == {}


def test_geo_private_ip_returns_empty(settings, tmp_path):
    # even if a path is set, a private/invalid IP yields nothing, no exception
    settings.GEOIP_PATH = str(tmp_path)
    assert geoip.lookup_geo("10.0.0.1") == {}
    assert geoip.lookup_geo("") == {}
```

- [ ] **Step 4: Run, verify fail**

Run: `python -m pytest connectionlog/tests/test_geoip.py -q` → FAIL (module missing).

- [ ] **Step 5: Implement (graceful degradation)**

```python
# connectionlog/geoip.py
import logging
from functools import lru_cache

from django.conf import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _reader():
    """Return a django.contrib.gis.geoip2.GeoIP2 reader, or None if the DB
    path is unset/unreadable. Cached so the .mmdb is memory-mapped once."""
    path = getattr(settings, "GEOIP_PATH", "") or ""
    if not path:
        return None
    try:
        from django.contrib.gis.geoip2 import GeoIP2
        return GeoIP2(path)
    except Exception as exc:  # missing file, bad DB, geoip2 not installed
        logger.warning("GeoIP2 unavailable (%s) — geolocation disabled", exc)
        return None


def lookup_geo(ip: str) -> dict:
    """Best-effort city-level geolocation for a public IP. Returns {} on any
    failure (no DB, private/invalid IP, lookup miss) — never raises."""
    reader = _reader()
    if not reader or not ip:
        return {}
    try:
        data = reader.city(ip)
    except Exception:
        return {}
    return {
        "country": (data.get("country_name") or "")[:120],
        "country_code": (data.get("country_code") or "")[:2],
        "city": (data.get("city") or "")[:180],
        "region": (data.get("region") or data.get("region_name") or "")[:180],
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
    }
```

> Note: `GeoIP2.city()` raises for private/unknown IPs → caught, `{}` returned. The `settings`-based `GEOIP_PATH` swap in tests requires clearing the cache; add `geoip._reader.cache_clear()` at the top of each test (update the test accordingly).

Update the test to call `geoip._reader.cache_clear()` first in each test.

- [ ] **Step 6: Run, verify pass; commit**

```bash
python -m pytest connectionlog/tests/test_geoip.py -q
git add quizonline-server/connectionlog/geoip.py quizonline-server/connectionlog/tests/test_geoip.py quizonline-server/requirements.txt quizonline-server/config/settings_base.py
git commit -m "feat(connectionlog): offline MaxMind geolocation with graceful fallback"
```

### Task A4: Capture service + serializers + viewset + urls + throttle

**Files:**
- Create: `connectionlog/services.py`, `connectionlog/serializers.py`, `connectionlog/views.py`, `connectionlog/api_urls.py`
- Modify: `config/api_urls.py`, `config/settings_base.py` (throttle scope + rate)
- Test: `connectionlog/tests/test_capture.py`, `connectionlog/tests/test_list_permissions.py`

- [ ] **Step 1: Throttle settings**

In `config/settings_base.py`: add `THROTTLE_CONNECTION_LOG=(str, "30/min")` to the env schema, and add `"connection_log": env("THROTTLE_CONNECTION_LOG")` to the `DEFAULT_THROTTLE_RATES` dict (find the existing rates dict that maps the other scopes).

- [ ] **Step 2: Write failing tests**

```python
# connectionlog/tests/test_capture.py
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from connectionlog.models import ConnectionEvent


@pytest.mark.django_db
def test_capture_records_event_with_server_fields():
    user = get_user_model().objects.create(email="u@x.com", username="u@x.com")
    c = APIClient(); c.force_authenticate(user)
    resp = c.post("/api/connection-log/", {
        "login_method": "password",
        "local_time": "2026-06-03 10:00 +02:00",
        "browser_language": "fr-FR",
        "timezone": "Europe/Brussels",
        "screen_width": 1920, "screen_height": 1080,
        "online": True,
    }, format="json", HTTP_USER_AGENT="Mozilla/5.0 (Windows NT 10.0) Chrome/124.0")
    assert resp.status_code == 201
    ev = ConnectionEvent.objects.get()
    assert ev.user == user and ev.account_email == "u@x.com"   # account derived server-side
    assert "Chrome" in ev.browser                              # UA parsed server-side
    assert ev.timezone == "Europe/Brussels"                    # client field stored


@pytest.mark.django_db
def test_capture_requires_auth():
    resp = APIClient().post("/api/connection-log/", {}, format="json")
    assert resp.status_code in (401, 403)
```

```python
# connectionlog/tests/test_list_permissions.py
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from connectionlog.models import ConnectionEvent


@pytest.mark.django_db
def test_list_is_superuser_only():
    U = get_user_model()
    normal = U.objects.create(email="n@x.com", username="n@x.com")
    su = U.objects.create(email="s@x.com", username="s@x.com", is_superuser=True, is_staff=True)
    ConnectionEvent.objects.create(account_email="n@x.com", login_method="password")
    c = APIClient(); c.force_authenticate(normal)
    assert c.get("/api/connection-log/").status_code == 403
    c.force_authenticate(su)
    resp = c.get("/api/connection-log/")
    assert resp.status_code == 200
    assert len(resp.data["results"]) == 1


@pytest.mark.django_db
def test_list_daterange_filter():
    from django.utils import timezone
    from datetime import timedelta
    U = get_user_model()
    su = U.objects.create(email="s@x.com", username="s@x.com", is_superuser=True)
    old = ConnectionEvent.objects.create(account_email="a", login_method="password")
    ConnectionEvent.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=10))
    ConnectionEvent.objects.create(account_email="b", login_method="password")  # now
    c = APIClient(); c.force_authenticate(su)
    start = (timezone.now() - timedelta(days=1)).date().isoformat()
    resp = c.get(f"/api/connection-log/?start={start}")
    assert resp.status_code == 200
    assert [r["account_email"] for r in resp.data["results"]] == ["b"]
```

- [ ] **Step 3: Run, verify fail**

Run: `python -m pytest connectionlog/tests/test_capture.py connectionlog/tests/test_list_permissions.py -q` → FAIL (404 / no route).

- [ ] **Step 4: Implement service**

```python
# connectionlog/services.py
from domain.view_mixins._helpers import client_ip
from .geoip import lookup_geo
from .models import ConnectionEvent
from .useragent import parse_user_agent


def record_connection(*, user, request, client: dict) -> ConnectionEvent:
    """Create a ConnectionEvent from the authenticated user + request +
    browser-supplied ``client`` dict. Server-derived fields (account, ip,
    UA, geo) always win over anything in ``client``."""
    ua_string = request.META.get("HTTP_USER_AGENT", "")
    ip = client_ip(request) or None
    parsed = parse_user_agent(ua_string)
    geo = lookup_geo(ip or "")
    return ConnectionEvent.objects.create(
        user=user,
        account_email=getattr(user, "email", "") or "",
        login_method=client.get("login_method") or ConnectionEvent.PASSWORD,
        ip=ip,
        user_agent=ua_string,
        browser=parsed["browser"],
        os=parsed["os"],
        local_time=(client.get("local_time") or "")[:64],
        browser_language=(client.get("browser_language") or "")[:64],
        timezone=(client.get("timezone") or "")[:64],
        screen_width=client.get("screen_width"),
        screen_height=client.get("screen_height"),
        online=client.get("online"),
        **geo,
    )
```

- [ ] **Step 5: Implement serializers**

```python
# connectionlog/serializers.py
from rest_framework import serializers
from .models import ConnectionEvent


class ConnectionEventWriteSerializer(serializers.Serializer):
    """Browser-supplied context only. Server derives account/ip/ua/geo."""
    login_method = serializers.ChoiceField(
        choices=[ConnectionEvent.PASSWORD, ConnectionEvent.MAGIC_LINK],
        default=ConnectionEvent.PASSWORD,
    )
    local_time = serializers.CharField(required=False, allow_blank=True, max_length=64)
    browser_language = serializers.CharField(required=False, allow_blank=True, max_length=64)
    timezone = serializers.CharField(required=False, allow_blank=True, max_length=64)
    screen_width = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    screen_height = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    online = serializers.BooleanField(required=False, allow_null=True)


class ConnectionEventReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConnectionEvent
        fields = [
            "id", "account_email", "created_at", "login_method", "ip",
            "user_agent", "browser", "os", "local_time", "browser_language",
            "timezone", "screen_width", "screen_height", "online",
            "country", "country_code", "city", "region", "latitude", "longitude",
        ]
```

- [ ] **Step 6: Implement viewset + urls**

```python
# connectionlog/views.py
from rest_framework import mixins, viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from config.permissions import IsSuperUser
from .models import ConnectionEvent
from .serializers import ConnectionEventReadSerializer, ConnectionEventWriteSerializer
from .services import record_connection


class ConnectionEventViewSet(mixins.CreateModelMixin, mixins.ListModelMixin,
                             viewsets.GenericViewSet):
    queryset = ConnectionEvent.objects.all()
    serializer_class = ConnectionEventReadSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated()]
        return [IsSuperUser()]

    def get_throttles(self):
        if self.action == "create":
            t = ScopedRateThrottle(); t.scope = "connection_log"
            return [t]
        return []

    def get_queryset(self):
        qs = ConnectionEvent.objects.all()
        start = self.request.query_params.get("start")
        end = self.request.query_params.get("end")
        if start:
            qs = qs.filter(created_at__date__gte=start)
        if end:
            qs = qs.filter(created_at__date__lte=end)
        return qs

    def create(self, request, *args, **kwargs):
        write = ConnectionEventWriteSerializer(data=request.data)
        write.is_valid(raise_exception=True)
        ev = record_connection(user=request.user, request=request, client=write.validated_data)
        return Response(ConnectionEventReadSerializer(ev).data, status=status.HTTP_201_CREATED)
```

```python
# connectionlog/api_urls.py
from rest_framework.routers import DefaultRouter
from .views import ConnectionEventViewSet

router = DefaultRouter()
router.register(r"connection-log", ConnectionEventViewSet, basename="connection-log")
urlpatterns = router.urls
```

Mount in `config/api_urls.py` (add to `urlpatterns`):
```python
    path("", include(("connectionlog.api_urls", "connectionlog"), namespace="connectionlog-api")),
```

- [ ] **Step 7: Run all connectionlog tests**

Run: `python -m pytest connectionlog -q`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add quizonline-server/connectionlog/ quizonline-server/config/api_urls.py quizonline-server/config/settings_base.py
git commit -m "feat(connectionlog): capture (auth) + list (superuser, daterange) endpoints"
```

---

## PHASE B — OpenAPI client

### Task B1: Regenerate the Angular API client

- [ ] **Step 1: Regenerate**

Run from repo root: `powershell -ExecutionPolicy Bypass -File .\scripts\sync-openapi.ps1`
Expected: new `connection-log` operations appear under `quizonline-frontend/src/app/api/generated`.

- [ ] **Step 2: Commit (same commit set as the backend endpoints)**

```bash
git add quizonline-frontend/src/app/api/generated quizonline-frontend/openapi.yaml quizonline-server/openapi.yaml
git commit -m "chore(openapi): regenerate client for connection-log endpoints"
```

---

## PHASE C — Frontend capture on login

### Task C1: ConnectionLogService

**Files:**
- Create: `quizonline-frontend/src/app/services/connection-log/connection-log.service.ts`

- [ ] **Step 1: Implement the service**

```ts
import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {catchError} from 'rxjs/operators';
import {EMPTY, Observable} from 'rxjs';

export type LoginMethod = 'password' | 'magic_link';

@Injectable({providedIn: 'root'})
export class ConnectionLogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/connection-log`;

  /** Fire-and-forget: record the current login with browser context.
   *  Never throws / never blocks the login flow. */
  record(loginMethod: LoginMethod): void {
    const body = {
      login_method: loginMethod,
      local_time: new Date().toString(),
      browser_language: navigator.language ?? '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
      screen_width: window.screen?.width ?? null,
      screen_height: window.screen?.height ?? null,
      online: navigator.onLine ?? null,
    };
    this.http.post(`${this.baseUrl}/`, body).pipe(catchError(() => EMPTY)).subscribe();
  }

  list(start?: string, end?: string): Observable<unknown> {
    const params: Record<string, string> = {};
    if (start) params['start'] = start;
    if (end) params['end'] = end;
    return this.http.get(`${this.baseUrl}/`, {params});
  }
}
```

> Confirm `environment.apiBaseUrl` is the base used by other services (grep an existing service, e.g. `catalog.service.ts`, and match its base-URL pattern exactly).

- [ ] **Step 2: Verify + commit**

Run: `cd quizonline-frontend && npm run typecheck` → PASS.
```bash
git add quizonline-frontend/src/app/services/connection-log/
git commit -m "feat(connection-log): client service (record + list)"
```

### Task C2: Hook capture into the login flows

**Files:**
- Modify: the password-login success handler and the magic-link exchange success handler (grep `setTokens`/`login(`/`magic` in `services/auth` + `pages/auth/login` + the magic-link component).

- [ ] **Step 1:** Inject `ConnectionLogService` and, immediately after a successful token obtain, call `record('password')` (password login) / `record('magic_link')` (magic-link). Place it where navigation-after-login happens, so it only fires on real success. It is fire-and-forget — do not await, do not block navigation.

- [ ] **Step 2:** `npm run typecheck` → PASS. Manually confirm (or unit-test the auth service) that `record` is called once on success.

- [ ] **Step 3: Commit**

```bash
git add quizonline-frontend/src/app/
git commit -m "feat(connection-log): record a connection event on each successful login"
```

---

## PHASE D — Admin page (list + popup + daterange)

### Task D1: Route + superuser guard + admin-menu link

**Files:**
- Modify: `quizonline-frontend/src/app/app.routes.ts`, `components/topmenu/topmenu.html`/`.ts`, `*.i18n` for the menu label.
- Create: `pages/admin/connections/connections.ts` (placeholder component first).

- [ ] **Step 1:** Create a minimal standalone `ConnectionsPage` component (OnPush, `inject()`), template `<p-card>Connections</p-card>` for now.
- [ ] **Step 2:** Add route `{ path: 'admin/connections', loadComponent: () => import(...).then(m => m.ConnectionsPage), canActivate: [authGuard, superuserGuard] }` to `app.routes.ts` (mirror an existing superuser route).
- [ ] **Step 3:** Add a link in the admin menu (`topmenu` — the `is_superuser`-gated `adminMenu`) pointing to `/admin/connections`, label via i18n (`topmenu` dict, add a key in all 5 languages).
- [ ] **Step 4:** `npm run check:i18n` + `npm run typecheck` → PASS. Confirm the link shows only for superusers and the route is guarded.
- [ ] **Step 5: Commit** — `feat(connection-log): admin route + superuser menu link`.

### Task D2: List + daterange + details popup

**Files:**
- Modify: `pages/admin/connections/connections.ts`/`.html`/`.scss`/`.i18n.ts`
- Modify: `quizonline-frontend/scripts/check-i18n.ts` (register the page dict)

- [ ] **Step 1:** Page state with signals: `range = signal<[Date, Date] | null>(null)`, `events = signal<ConnectionEventDto[]>([])`, `loading`, `selected = signal<ConnectionEventDto | null>(null)`. On range change (and on init), call `ConnectionLogService.list(startIso, endIso)` and set `events`.
- [ ] **Step 2:** Template: a `p-datepicker` `selectionMode="range"` bound to `range`; a `p-table` of `events()` with columns date (`| relativeDate`, title absolute `| date:'medium'`), `account_email`, `ip`, country/city, `browser`/`os`, and a row **details** button (`size="small"`, `text`) → `selected.set(row)`. Empty state via `<app-empty-state>`.
- [ ] **Step 3:** A `p-dialog` `[visible]="selected() !== null"` showing every field of `selected()` in a definition list. All labels via the page i18n dict (FR/EN/NL/IT/ES); register `getConnectionsUiText` in `scripts/check-i18n.ts`.
- [ ] **Step 4:** `npm run check:i18n` + `npm run typecheck` + `npm run build` → PASS.
- [ ] **Step 5: Commit** — `feat(connection-log): admin list with daterange filter + details popup`.

---

## PHASE E — Map

### Task E1: Leaflet map of events

**Files:**
- Modify: `package.json` (`leaflet` + `@types/leaflet`), `angular.json` (leaflet CSS asset), `pages/admin/connections/connections.*`

- [ ] **Step 1:** `cd quizonline-frontend && npm install leaflet @types/leaflet`. Add Leaflet's CSS to the build: in `angular.json` `styles`, add `"node_modules/leaflet/dist/leaflet.css"` (or import it in the page `.scss` via `@use`/`@import`). Confirm marker-icon assets resolve (set `L.Icon.Default.imagePath` or import the icon images) — Leaflet's default markers need the image path configured under Angular; set it explicitly to avoid 404s.
- [ ] **Step 2:** In `connections.ts`, after view init, create a Leaflet map in a `#map` div; on `events()` change (use `effect()`), clear existing markers and add one marker per event that has `latitude`+`longitude`; bind a popup (`account_email`, city, date). Fit bounds to markers when any exist; otherwise a sensible default view. Use marker clustering only if needed (skip `leaflet.markercluster` for v1 unless point counts are large — note this as a deferred optimization).
- [ ] **Step 3:** `npm run build` → PASS. Manually confirm tiles + markers render.
- [ ] **Step 4: Commit** — `feat(connection-log): map view of connection events (Leaflet/OSM)`.

---

## PHASE F — Deployment + ops

### Task F1: MaxMind DB provisioning + docs + gitignore

**Files:**
- Modify: `.gitignore` (`*.mmdb`), `deploy/README.md` (new section), `deploy/env.production.example` (`GEOIP_PATH`, `MAXMIND_LICENSE_KEY`)

- [ ] **Step 1:** Add `*.mmdb` to `.gitignore`.
- [ ] **Step 2:** Add `GEOIP_PATH` and `MAXMIND_LICENSE_KEY` to `deploy/env.production.example`. Seed `MAXMIND_LICENSE_KEY` into SSM (the seed script + env-fetch already cover it). `GEOIP_PATH` points at the directory holding `GeoLite2-City.mmdb` on the EC2 (e.g. `/var/lib/geoip`).
- [ ] **Step 3:** Document in `deploy/README.md`: create a free MaxMind account → license key → install `geoipupdate` (or a one-off `curl` download of `GeoLite2-City.mmdb`), place it under `GEOIP_PATH`, and a monthly cron/`geoipupdate` to refresh. Note that geo degrades gracefully if absent.
- [ ] **Step 4: Commit** — `docs(deploy): MaxMind GeoLite2 provisioning + GEOIP_PATH`.

> Throttle seeding: add `THROTTLE_CONNECTION_LOG` to the SSM-seed list the same way as the LMS throttles (see `deploy/README.md` LMS throttles section) — include it in the F1 commit or note it there.

---

## Final verification

- Backend: `cd quizonline-server && python -m pytest connectionlog -q` green; `python -m pytest -q` (full) green; `python manage.py makemigrations --check --dry-run` clean.
- Frontend: `npm run check:i18n`, `npm run typecheck`, `npm run lint`, `npm run build` all green.
- OpenAPI: no drift.
- Manual: log in (password + magic-link) → an event appears; `/admin/connections` shows the list + popup + map for a superuser, 403/redirect for a normal user; daterange filters both list and map.

---

## Self-review notes

- **Spec coverage:** model (A1), UA→browser/OS (A2), MaxMind offline + graceful (A3), capture endpoint auth + list superuser + daterange + throttle (A4), OpenAPI (B1), capture-on-login both methods (C1/C2), admin route+guard+menu (D1), list+daterange+popup (D2), map (E1), deploy/MaxMind/gitignore/throttle (F1), GDPR/unlimited-retention documented in the spec (no purge task by design). All spec sections map to a task.
- **No auto-purge** is intentional (owner's choice) — explicitly no task.
- **Type consistency:** `record_connection(*, user, request, client)`, `lookup_geo(ip) -> dict`, `parse_user_agent(ua) -> {browser, os}`, read fields list, and the service spreading `**geo` all use the same names as the model fields.
