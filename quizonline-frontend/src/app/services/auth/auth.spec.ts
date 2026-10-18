import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, TestRequest, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';

import {UserService} from '../user/user';
import {AuthService, LEGACY_REFRESH_KEY, refreshRejected, SESSION_HINT_KEY} from './auth';

describe('Auth', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

/** Every value written to local / session storage, to prove no token lands there. */
function storedValues(): string[] {
  const values: string[] = [];
  for (const storage of [localStorage, sessionStorage]) {
    for (let i = 0; i < storage.length; i++) {
      values.push(storage.getItem(storage.key(i) as string) ?? '');
    }
  }
  return values;
}

describe('AuthService — HttpOnly refresh cookie', () => {
  let service: AuthService;
  let backend: HttpTestingController;

  function setUp(): void {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    backend = TestBed.inject(HttpTestingController);
  }

  // The refresh POST may run under a Web Lock (a Promise): retry
  // ``expectOne`` until the request exists.
  async function awaitRequest(suffix: string): Promise<TestRequest> {
    let req: TestRequest | undefined;
    await vi.waitFor(() => {
      req = backend.expectOne((r) => r.url.endsWith(suffix));
    });
    return req as TestRequest;
  }

  function expectCookieOptIn(req: TestRequest): void {
    expect(req.request.headers.get('X-Auth-Mode')).toBe('cookie');
    expect(req.request.withCredentials).toBe(true);
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    backend?.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('treats 400/401/403 as a rejected refresh, never 0 or 5xx', () => {
    expect(refreshRejected({status: 401})).toBe(true);
    expect(refreshRejected({status: 403})).toBe(true);
    expect(refreshRejected({status: 400})).toBe(true);
    expect(refreshRejected({status: 0})).toBe(false);
    expect(refreshRejected({status: 503})).toBe(false);
  });

  it('login opts into the cookie, forwards remember_me and keeps the access token in memory only', async () => {
    setUp();
    const done = new Promise<void>((resolve) =>
      service.login('a@x.test', 'pw', false).subscribe({next: () => resolve()}),
    );
    const login = await awaitRequest('/api/v1/token/');
    expectCookieOptIn(login);
    expect(login.request.body).toEqual({email: 'a@x.test', password: 'pw', remember_me: false});
    login.flush({access: 'a-1'});
    (await awaitRequest('/api/v1/user/me/')).flush({id: 1, email: 'a@x.test'});
    await done;

    expect(service.getAccessToken()).toBe('a-1');
    expect(localStorage.getItem(SESSION_HINT_KEY)).toBeTruthy();
    expect(storedValues().some((v) => v.includes('a-1'))).toBe(false);
  });

  it('refreshes through the cookie with an empty body and shares one in-flight request', async () => {
    localStorage.setItem(SESSION_HINT_KEY, '1');
    setUp();
    const first = service.refreshTokens();
    const second = service.refreshTokens();
    expect(second).toBe(first);
    const result = new Promise((resolve) => first?.subscribe(resolve));
    const req = await awaitRequest('/api/v1/token/refresh/');
    expectCookieOptIn(req);
    expect(req.request.body).toEqual({});
    req.flush({access: 'a-2'});
    await result;
    expect(service.getAccessToken()).toBe('a-2');
    expect(storedValues().some((v) => v.includes('a-2'))).toBe(false);
  });

  it('does not attempt a refresh without any session', () => {
    setUp();
    expect(service.refreshTokens()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });

  describe('silent restore', () => {
    it('makes no call for an anonymous visitor', async () => {
      setUp();
      await service.restore();
      backend.expectNone(() => true);
    });

    it('restores the session from the cookie, then loads /me', async () => {
      localStorage.setItem(SESSION_HINT_KEY, '1');
      setUp();
      const restored = service.restore();
      (await awaitRequest('/api/v1/token/refresh/')).flush({access: 'a-3'});
      const me = await awaitRequest('/api/v1/user/me/');
      me.flush({id: 7, email: 'r@x.test'});
      await restored;
      expect(service.getAccessToken()).toBe('a-3');
      expect(TestBed.inject(UserService).currentUser()?.id).toBe(7);
    });

    it('ends the session when the cookie is rejected', async () => {
      localStorage.setItem(SESSION_HINT_KEY, '1');
      setUp();
      const restored = service.restore();
      (await awaitRequest('/api/v1/token/refresh/')).flush(
        {code: 'refresh_cookie_missing'},
        {status: 401, statusText: 'Unauthorized'},
      );
      await restored;
      expect(localStorage.getItem(SESSION_HINT_KEY)).toBeNull();
      expect(service.isLoggedIn()).toBe(false);
    });

    it('keeps the hint on a 5xx so the next load retries', async () => {
      localStorage.setItem(SESSION_HINT_KEY, '1');
      setUp();
      const restored = service.restore();
      (await awaitRequest('/api/v1/token/refresh/')).flush({}, {status: 503, statusText: 'Unavailable'});
      await restored;
      expect(localStorage.getItem(SESSION_HINT_KEY)).toBe('1');
      expect(service.getAccessToken()).toBeNull();
    });
  });

  describe('legacy localStorage migration', () => {
    it('presents the stored refresh token once, then deletes it', async () => {
      localStorage.setItem(LEGACY_REFRESH_KEY, 'legacy-r');
      localStorage.setItem('remember_me', '1');
      setUp();
      const restored = service.restore();
      const req = await awaitRequest('/api/v1/token/refresh/');
      expectCookieOptIn(req);
      expect(req.request.body).toEqual({refresh: 'legacy-r'});
      req.flush({access: 'a-4'});
      (await awaitRequest('/api/v1/user/me/')).flush({id: 1});
      await restored;
      expect(localStorage.getItem(LEGACY_REFRESH_KEY)).toBeNull();
      expect(localStorage.getItem('remember_me')).toBeNull();
      // From now on the hint drives the restore.
      expect(localStorage.getItem(SESSION_HINT_KEY)).toBeTruthy();
    });

    it('migrates a sessionStorage token too', async () => {
      sessionStorage.setItem(LEGACY_REFRESH_KEY, 'legacy-s');
      setUp();
      const restored = service.restore();
      const req = await awaitRequest('/api/v1/token/refresh/');
      expect(req.request.body).toEqual({refresh: 'legacy-s'});
      req.flush({access: 'a-5'});
      (await awaitRequest('/api/v1/user/me/')).flush({id: 1});
      await restored;
      expect(sessionStorage.getItem(LEGACY_REFRESH_KEY)).toBeNull();
    });

    it('deletes a legacy token the server rejects', async () => {
      localStorage.setItem(LEGACY_REFRESH_KEY, 'legacy-r');
      setUp();
      const restored = service.restore();
      (await awaitRequest('/api/v1/token/refresh/')).flush({}, {status: 401, statusText: 'Unauthorized'});
      await restored;
      expect(localStorage.getItem(LEGACY_REFRESH_KEY)).toBeNull();
    });

    it('keeps a legacy token on a network error', async () => {
      localStorage.setItem(LEGACY_REFRESH_KEY, 'legacy-r');
      setUp();
      const restored = service.restore();
      (await awaitRequest('/api/v1/token/refresh/')).error(new ProgressEvent('error'), {status: 0});
      await restored;
      expect(localStorage.getItem(LEGACY_REFRESH_KEY)).toBe('legacy-r');
    });
  });

  describe('multi-tab', () => {
    it('drops the in-memory session when another tab logs out', async () => {
      localStorage.setItem(SESSION_HINT_KEY, '1');
      setUp();
      const refresh = new Promise((resolve) => service.refreshTokens()?.subscribe(resolve));
      (await awaitRequest('/api/v1/token/refresh/')).flush({access: 'a-6'});
      await refresh;

      localStorage.removeItem(SESSION_HINT_KEY);
      window.dispatchEvent(new StorageEvent('storage', {
        key: SESSION_HINT_KEY, newValue: null, storageArea: localStorage,
      }));
      expect(service.getAccessToken()).toBeNull();
      expect(service.isLoggedIn()).toBe(false);
    });

    it('re-restores from the shared cookie when another tab signs in', async () => {
      setUp();
      localStorage.setItem(SESSION_HINT_KEY, '2');
      window.dispatchEvent(new StorageEvent('storage', {
        key: SESSION_HINT_KEY, newValue: '2', storageArea: localStorage,
      }));
      (await awaitRequest('/api/v1/token/refresh/')).flush({access: 'a-7'});
      (await awaitRequest('/api/v1/user/me/')).flush({id: 2});
      await vi.waitFor(() => expect(service.getAccessToken()).toBe('a-7'));
    });

    it('ignores storage events about other keys', () => {
      setUp();
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'theme', newValue: 'dark', storageArea: localStorage,
      }));
      backend.expectNone(() => true);
    });
  });

  it('signOut revokes the cookie server-side without a body token (audit M12)', async () => {
    localStorage.setItem(SESSION_HINT_KEY, '1');
    setUp();
    service.signOut();
    // Runs under the refresh Web Lock: issued asynchronously.
    const req = await awaitRequest('/api/v1/token/blacklist/');
    expectCookieOptIn(req);
    expect(req.request.body).toEqual({});
    req.flush(null, {status: 204, statusText: 'No Content'});
    expect(service.isLoggedIn()).toBe(false);
    expect(localStorage.getItem(SESSION_HINT_KEY)).toBeNull();
  });

  it('changePassword adopts the fresh access token and announces the change', async () => {
    setUp();
    const done = new Promise((resolve) =>
      service.changePassword({old_password: 'a', new_password: 'b'}).subscribe(resolve),
    );
    const req = await awaitRequest('/api/v1/user/password/change/');
    expectCookieOptIn(req);
    req.flush({detail: 'ok', access: 'a-8'});
    await done;
    expect(service.getAccessToken()).toBe('a-8');
    expect(localStorage.getItem(SESSION_HINT_KEY)).toBeTruthy();
  });

  it('exchangeMagicLink opts into the cookie and starts the session', async () => {
    setUp();
    const done = new Promise((resolve) => service.exchangeMagicLink('tok').subscribe(resolve));
    const req = await awaitRequest('/api/v1/auth/magic-link/exchange/');
    expectCookieOptIn(req);
    expect(req.request.body).toEqual({token: 'tok'});
    req.flush({access: 'a-9'});
    (await awaitRequest('/api/v1/user/me/')).flush({id: 3});
    await done;
    expect(service.getAccessToken()).toBe('a-9');
    expect(storedValues().some((v) => v.includes('a-9'))).toBe(false);
  });
});
