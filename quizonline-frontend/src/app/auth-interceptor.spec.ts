import {HttpClient, provideHttpClient, withInterceptors} from '@angular/common/http';
import {HttpTestingController, TestRequest, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';

import {AuthInterceptor, refreshRejected} from './auth-interceptor';
import {AuthService, SESSION_HINT_KEY} from './services/auth/auth';

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(SESSION_HINT_KEY, '1');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([AuthInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // The refresh POST runs under a Web Lock (a Promise), so requests are
  // issued asynchronously: retry ``expectOne`` until the request exists
  // (it throws without consuming anything while there is none).
  async function awaitRequest(match: (url: string) => boolean): Promise<TestRequest> {
    let req: TestRequest | undefined;
    await vi.waitFor(() => {
      req = backend.expectOne((r) => match(r.url));
    });
    return req as TestRequest;
  }
  const expectRefresh = () => awaitRequest((url) => url.endsWith('/token/refresh/'));

  it('only a 400/401/403 refresh ends the session', () => {
    expect(refreshRejected({status: 401})).toBe(true);
    expect(refreshRejected({status: 403})).toBe(true);
    expect(refreshRejected({status: 400})).toBe(true);
    expect(refreshRejected({status: 0})).toBe(false);
    expect(refreshRejected({status: 503})).toBe(false);
  });

  it('refreshes through the cookie before a cold-start API call', async () => {
    const done = new Promise<void>((resolve) =>
      http.get('/api/v1/user/me/').subscribe({next: () => resolve()}),
    );
    const refresh = await expectRefresh();
    expect(refresh.request.headers.get('X-Auth-Mode')).toBe('cookie');
    expect(refresh.request.withCredentials).toBe(true);
    refresh.flush({access: 'a-1'});
    const replay = await awaitRequest((url) => url === '/api/v1/user/me/');
    expect(replay.request.headers.get('Authorization')).toBe('Bearer a-1');
    // Only the auth calls carry credentials / the opt-in header.
    expect(replay.request.withCredentials).toBe(false);
    expect(replay.request.headers.has('X-Auth-Mode')).toBe(false);
    replay.flush({});
    await done;
  });

  it('keeps the session when the refresh fails with a 5xx (audit I9)', async () => {
    const done = new Promise<void>((resolve) =>
      http.get('/api/v1/user/me/').subscribe({error: () => resolve()}),
    );
    (await expectRefresh()).flush({}, {status: 503, statusText: 'Unavailable'});
    await done;
    expect(localStorage.getItem(SESSION_HINT_KEY)).toBe('1');
    expect(auth.isLoggedIn()).toBe(true);
  });

  it('logs out when the server rejects the refresh cookie', async () => {
    const done = new Promise<void>((resolve) =>
      http.get('/api/v1/user/me/').subscribe({error: () => resolve()}),
    );
    (await expectRefresh()).flush({}, {status: 401, statusText: 'Unauthorized'});
    await done;
    expect(localStorage.getItem(SESSION_HINT_KEY)).toBeNull();
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('does not log out when the replayed request fails', async () => {
    const status = new Promise<number>((resolve) =>
      http.get('/api/v1/user/me/').subscribe({error: (e) => resolve(e.status)}),
    );
    (await expectRefresh()).flush({access: 'a-2'});
    const replay = await awaitRequest((url) => url === '/api/v1/user/me/');
    expect(replay.request.headers.get('Authorization')).toBe('Bearer a-2');
    replay.flush({}, {status: 500, statusText: 'Server Error'});
    expect(await status).toBe(500);
    expect(auth.isLoggedIn()).toBe(true);
  });
});
