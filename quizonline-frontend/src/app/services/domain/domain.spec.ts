import {provideHttpClient, withXhr} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {Observable} from 'rxjs';
import {afterEach, beforeEach, describe, expect, it, MockInstance, vi} from 'vitest';

import {DomainReadDto} from '../../api/generated/model/domain-read';
import {DomainService} from './domain';

const domains = [
  {id: 1, translations: {fr: {name: 'Mathématiques', description: 'Algèbre'}}},
  {id: 2, translations: {en: {name: 'History', description: 'Ancient Rome'}}},
  {id: 3, translations: undefined},
];

describe('DomainService', () => {
  let service: DomainService;
  let http: HttpTestingController;
  let navigate: MockInstance<Router['navigate']>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(DomainService);
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  const isList = (r: {url: string; method: string}) =>
    r.method === 'GET' && /\/api\/v1\/domain\/$/.test(r.url);

  function listOnce(params?: {name?: string; search?: string}): DomainReadDto[] | undefined {
    let out: DomainReadDto[] | undefined;
    service.list(params).subscribe((r) => (out = r));
    return out;
  }

  describe('list', () => {
    it('walks every page of the paginated list', () => {
      let out: DomainReadDto[] | undefined;
      service.list().subscribe((r) => (out = r));
      const p1 = http.expectOne(isList);
      expect(p1.request.params.get('page')).toBe('1');
      p1.flush({next: 'p2', results: [domains[0]]});
      const p2 = http.expectOne(isList);
      expect(p2.request.params.get('page')).toBe('2');
      p2.flush({next: null, results: [domains[1]]});
      expect(out?.map((d) => d.id)).toEqual([1, 2]);
    });

    it('serves a fresh cached copy without refetching, then refetches once stale', () => {
      vi.useFakeTimers();
      service.list().subscribe();
      http.expectOne(isList).flush({next: null, results: domains});

      expect(listOnce()?.length).toBe(3);
      http.expectNone(isList);

      vi.advanceTimersByTime(61_000);
      service.list().subscribe();
      http.expectOne(isList).flush({next: null, results: []});
    });

    it('filters on name and description across translations, case-insensitively', () => {
      service.list().subscribe();
      http.expectOne(isList).flush({next: null, results: domains});

      expect(listOnce({name: '  MATH '})?.map((d) => d.id)).toEqual([1]);
      expect(listOnce({search: 'rome'})?.map((d) => d.id)).toEqual([2]);
      expect(listOnce({name: 'history', search: 'algèbre'})).toEqual([]);
      expect(listOnce({name: '   '})?.length).toBe(3);
    });

    it.each([
      ['create', (s: DomainService) => s.create({} as never), 'POST', '/domain/'],
      ['update', (s: DomainService) => s.update(1, {} as never), 'PUT', '/domain/1/'],
      ['updatePartial', (s: DomainService) => s.updatePartial(1, {}), 'PATCH', '/domain/1/'],
      ['delete', (s: DomainService) => s.delete(1), 'DELETE', '/domain/1/'],
      ['clearCertificateLogo', (s: DomainService) => s.clearCertificateLogo(1), 'PATCH', '/domain/1/'],
      [
        'uploadCertificateLogo',
        (s: DomainService) => s.uploadCertificateLogo(1, new File(['x'], 'l.png')),
        'PATCH',
        '/domain/1/',
      ],
    ] as const)('%s busts the list cache', (_n, call, method, path) => {
      service.list().subscribe();
      http.expectOne(isList).flush({next: null, results: domains});

      (call as (s: DomainService) => Observable<unknown>)(service).subscribe();
      const req = http.expectOne((r) => r.url.endsWith(path) && r.method === method);
      req.flush({});

      service.list().subscribe();
      http.expectOne(isList).flush({next: null, results: []});
    });
  });

  it('sends the certificate logo as multipart and clears it with an explicit null', () => {
    service.uploadCertificateLogo(4, new File(['x'], 'logo.png')).subscribe();
    const up = http.expectOne((r) => r.url.endsWith('/domain/4/'));
    expect((up.request.body as FormData).get('certificate_logo')).toBeInstanceOf(File);
    up.flush({});

    service.clearCertificateLogo(4).subscribe();
    const clear = http.expectOne((r) => r.url.endsWith('/domain/4/'));
    expect(clear.request.body).toEqual({certificate_logo: null});
    clear.flush({});
  });

  it('availableForLinking walks every page', () => {
    let out: DomainReadDto[] | undefined;
    service.availableForLinking().subscribe((r) => (out = r));
    const match = (r: {url: string}) => r.url.endsWith('/domain/available-for-linking/');
    const p1 = http.expectOne(match);
    expect(p1.request.params.get('page')).toBe('1');
    p1.flush({next: 'x', results: [{id: 1}]});
    const p2 = http.expectOne(match);
    expect(p2.request.params.get('page')).toBe('2');
    p2.flush({next: null});
    expect(out?.map((d) => d.id)).toEqual([1]);
  });

  describe('join requests', () => {
    it('lists with a status filter, and without for "all"', () => {
      service.listJoinRequests(3, 'pending').subscribe();
      http.expectOne((r) => r.urlWithParams.endsWith('/domain/3/join-request/?status=pending')).flush([]);
      service.listJoinRequests(3, 'all').subscribe();
      http.expectOne((r) => r.urlWithParams.endsWith('/domain/3/join-request/')).flush([]);
      service.listJoinRequests(3).subscribe();
      http.expectOne((r) => r.urlWithParams.endsWith('/domain/3/join-request/')).flush([]);
    });

    it('rejects with a reason in the body', () => {
      service.rejectJoinRequest(3, 9, 'full').subscribe();
      const req = http.expectOne((r) => r.url.endsWith('/domain/3/join-request/9/reject/'));
      expect(req.request.body).toEqual({reason: 'full'});
      req.flush({});
    });

    it('bulk approve / reject send the ids', () => {
      service.bulkApproveJoinRequests(3, [1, 2]).subscribe();
      const a = http.expectOne((r) => r.method === 'POST' && r.url.includes('/domain/3/'));
      expect(a.request.body).toEqual({request_ids: [1, 2]});
      a.flush({});
      service.bulkRejectJoinRequests(3, [1], 'no').subscribe();
      const b = http.expectOne((r) => r.method === 'POST' && r.url.includes('/domain/3/'));
      expect(b.request.body).toEqual({request_ids: [1], reason: 'no'});
      b.flush({});
    });
  });

  it.each([
    ['retrieve', (s: DomainService) => s.retrieve(1)],
    ['detail', (s: DomainService) => s.detail(1)],
    ['leave', (s: DomainService) => s.leave(1)],
    ['cancelJoinRequest', (s: DomainService) => s.cancelJoinRequest(1, 2)],
    ['moderationSummary', (s: DomainService) => s.moderationSummary()],
    ['retrieveInviteByToken', (s: DomainService) => s.retrieveInviteByToken('t')],
    ['acceptInviteByToken', (s: DomainService) => s.acceptInviteByToken('t')],
    ['retrieveJoinRequestDecisionByToken', (s: DomainService) => s.retrieveJoinRequestDecisionByToken('t')],
    ['applyJoinRequestDecisionByToken', (s: DomainService) => s.applyJoinRequestDecisionByToken('t')],
    ['retrieveTransferByToken', (s: DomainService) => s.retrieveTransferByToken('t')],
    ['acceptTransferByToken', (s: DomainService) => s.acceptTransferByToken('t')],
    ['approveJoinRequest', (s: DomainService) => s.approveJoinRequest(1, 2)],
  ] as const)('%s issues exactly one request to the domain API', (_n, call) => {
    let done = false;
    (call as (s: DomainService) => Observable<unknown>)(service).subscribe({complete: () => (done = true)});
    const req = http.expectOne((r) => r.url.includes('/api/v1/domain/'));
    req.flush({});
    expect(done).toBe(true);
  });

  it('navigation helpers route to the domain pages', () => {
    service.goNew();
    service.goList();
    service.goBack();
    service.goEdit(5, {tab: 'members'});
    service.goDelete(5);
    expect(navigate).toHaveBeenCalledTimes(5);
    expect(navigate.mock.calls[3][1]).toEqual({queryParams: {tab: 'members'}});
    expect((navigate.mock.calls[4][0] as unknown[]).join('/')).toContain('5');
  });
});
