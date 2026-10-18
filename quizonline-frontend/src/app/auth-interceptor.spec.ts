import {HttpClient, provideHttpClient, withInterceptors} from '@angular/common/http';
import {HttpTestingController, TestRequest, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';

import {AuthInterceptor, refreshRejected} from './auth-interceptor';
import {AuthService} from './services/auth/auth';

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('refresh_token', 'r-1');
    localStorage.setItem('remember_me', '1');
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

  it('only a 400/401 refresh ends the session', () => {
    expect(refreshRejected({status: 401})).toBe(true);
    expect(refreshRejected({status: 400})).toBe(true);
    expect(refreshRejected({status: 0})).toBe(false);
    expect(refreshRejected({status: 503})).toBe(false);
  });

  it('keeps the session when the refresh fails with a 5xx (audit I9)', async () => {
    const done = new Promise<void>((resolve) =>
      http.get('/api/v1/user/me/').subscribe({error: () => resolve()}),
    );
    (await expectRefresh()).flush({}, {status: 503, statusText: 'Unavailable'});
    await done;
    expect(auth.getRefreshToken()).toBe('r-1');
  });

  it('logs out when the server rejects the refresh token', async () => {
    const done = new Promise<void>((resolve) =>
      http.get('/api/v1/user/me/').subscribe({error: () => resolve()}),
    );
    (await expectRefresh()).flush({}, {status: 401, statusText: 'Unauthorized'});
    await done;
    expect(auth.getRefreshToken()).toBeNull();
  });

  it('does not log out when the replayed request fails', async () => {
    const status = new Promise<number>((resolve) =>
      http.get('/api/v1/user/me/').subscribe({error: (e) => resolve(e.status)}),
    );
    (await expectRefresh()).flush({access: 'a-2', refresh: 'r-2'});
    const replay = await awaitRequest((url) => url === '/api/v1/user/me/');
    expect(replay.request.headers.get('Authorization')).toBe('Bearer a-2');
    replay.flush({}, {status: 500, statusText: 'Server Error'});
    expect(await status).toBe(500);
    expect(auth.getRefreshToken()).toBe('r-2');
  });
});
