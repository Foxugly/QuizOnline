import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {CatalogService} from './catalog.service';

describe('CatalogService editor reads', () => {
  let service: CatalogService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    service = TestBed.inject(CatalogService);
    http = TestBed.inject(HttpTestingController);
  });

  // Course / lesson retrieve are sent with ``Cache-Control: private, max-age=30``:
  // editor reads must revalidate or they show the state before the last edit.
  it.each([
    ['detailById', '/course/3/'],
    ['getSection', '/section/3/'],
    ['getLesson', '/lesson/3/'],
  ] as const)('%s revalidates instead of reading the browser cache', (method, path) => {
    service[method](3).subscribe();
    const req = http.expectOne((r) => r.url.endsWith(path));
    expect(req.request.method).toBe('GET');
    expect(req.request.cache).toBe('no-cache');
    req.flush({});
    http.verify();
  });
});
