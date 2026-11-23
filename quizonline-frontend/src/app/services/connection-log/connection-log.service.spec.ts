import {provideHttpClient, withXhr} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {ConnectionLogService} from './connection-log.service';

describe('ConnectionLogService', () => {
  let service: ConnectionLogService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideHttpClient(withXhr()), provideHttpClientTesting()]});
    service = TestBed.inject(ConnectionLogService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('records the login with client context and swallows failures', () => {
    service.record('magic_link');
    const req = http.expectOne((r) => r.url.endsWith('/connection-log/'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({
      login_method: 'magic_link',
      browser_language: navigator.language,
      online: navigator.onLine,
    });
    expect(typeof req.request.body.local_time).toBe('string');
    // a failing log must not surface an error to the login flow
    expect(() => req.flush('down', {status: 500, statusText: 'x'})).not.toThrow();
  });

  it('list forwards only the given bounds', () => {
    service.list('2026-01-01', '2026-02-01').subscribe();
    const both = http.expectOne((r) => r.url.endsWith('/connection-log/'));
    expect(both.request.params.get('start')).toBe('2026-01-01');
    expect(both.request.params.get('end')).toBe('2026-02-01');
    both.flush([]);

    service.list().subscribe();
    const none = http.expectOne((r) => r.url.endsWith('/connection-log/'));
    expect(none.request.params.keys()).toEqual([]);
    none.flush([]);
  });
});
