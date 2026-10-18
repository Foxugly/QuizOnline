import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';

import {AuthService} from './auth';

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

describe('AuthService session hardening', () => {
  let service: AuthService;
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('refresh_token', 'r-1');
    localStorage.setItem('remember_me', '1');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('adopts a refresh token rotated by another tab (audit I9)', () => {
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'refresh_token', newValue: 'r-2', storageArea: localStorage,
    }));
    expect(service.getRefreshToken()).toBe('r-2');
  });

  it('ends the session when another tab logs out', () => {
    localStorage.removeItem('refresh_token');
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'refresh_token', newValue: null, storageArea: localStorage,
    }));
    expect(service.getRefreshToken()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('signOut revokes the refresh token server-side (audit M12)', () => {
    service.signOut();
    const req = backend.expectOne((r) => r.url.endsWith('/api/v1/token/blacklist/'));
    expect(req.request.body).toEqual({refresh: 'r-1'});
    req.flush({});
    expect(service.isLoggedIn()).toBe(false);
  });
});
