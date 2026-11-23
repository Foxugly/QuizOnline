import {provideHttpClient, withXhr} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {Observable} from 'rxjs';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {EnrollmentService} from './enrollment.service';

describe('EnrollmentService', () => {
  let service: EnrollmentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideHttpClient(withXhr()), provideHttpClientTesting()]});
    service = TestBed.inject(EnrollmentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('listForCourse', () => {
    it('unwraps the DRF page envelope and forwards the status filter', () => {
      let rows: unknown[] | undefined;
      service.listForCourse(4, {status: 'pending'}).subscribe((r) => (rows = r));
      const req = http.expectOne((r) => r.url.endsWith('/api/v1/enrollment/'));
      expect(req.request.params.get('course')).toBe('4');
      expect(req.request.params.get('status')).toBe('pending');
      req.flush({count: 1, next: null, previous: null, results: [{id: 1}]});
      expect(rows).toEqual([{id: 1}]);
    });

    it('accepts a bare array and an envelope without results', () => {
      let rows: unknown[] | undefined;
      service.listForCourse(4).subscribe((r) => (rows = r));
      const req = http.expectOne((r) => r.url.endsWith('/api/v1/enrollment/'));
      expect(req.request.params.has('status')).toBe(false);
      req.flush([{id: 2}]);
      expect(rows).toEqual([{id: 2}]);

      service.listForCourse(4).subscribe((r) => (rows = r));
      http.expectOne(() => true).flush({count: 0, next: null});
      expect(rows).toEqual([]);
    });
  });

  it.each([
    ['myEnrollments', (s: EnrollmentService) => s.myEnrollments({status: 'active'}), '/enrollment/'],
    ['myInvitations', (s: EnrollmentService) => s.myInvitations({status: 'all'}), '/me/invitations/'],
    ['listInvitesForCourse', (s: EnrollmentService) => s.listInvitesForCourse(3, {status: 'pending'}), '/course/3/invites/'],
  ] as const)('%s forwards the status filter only when given', (_n, call, path) => {
    (call as (s: EnrollmentService) => Observable<unknown>)(service).subscribe();
    const withStatus = http.expectOne((r) => r.url.endsWith(path));
    expect(withStatus.request.params.has('status')).toBe(true);
    withStatus.flush([]);
  });

  it('omits the status param by default', () => {
    service.myEnrollments().subscribe();
    service.myInvitations().subscribe();
    service.listInvitesForCourse(3).subscribe();
    const reqs = http.match(() => true);
    expect(reqs).toHaveLength(3);
    for (const req of reqs) {
      expect(req.request.params.has('status')).toBe(false);
      req.flush([]);
    }
  });

  describe('reject', () => {
    it('sends the reason when present', () => {
      service.reject(5, 'full').subscribe();
      const req = http.expectOne((r) => r.url.endsWith('/enrollment/5/reject/'));
      expect(req.request.body).toEqual({reason: 'full'});
      req.flush({});
    });

    it.each([undefined, ''])('sends an empty body for reason %o', (reason) => {
      service.reject(5, reason).subscribe();
      const req = http.expectOne((r) => r.url.endsWith('/enrollment/5/reject/'));
      expect(req.request.body).toEqual({});
      req.flush({});
    });
  });

  it('completeLesson defaults to 100 %', () => {
    service.completeLesson(8).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/lesson/8/complete/'));
    expect(req.request.body).toEqual({progress_percent: 100});
    req.flush({});
    service.completeLesson(8, 40).subscribe();
    expect(http.expectOne(() => true).request.body).toEqual({progress_percent: 40});
  });

  it('myProgress follows next links across pages', () => {
    let rows: unknown;
    service.myProgress().subscribe((r) => (rows = r));
    http.expectOne((r) => r.url.endsWith('/api/v1/progress/')).flush({
      count: 2,
      next: 'http://api/api/v1/progress/?page=2',
      previous: null,
      results: [{id: 1}],
    });
    http.expectOne('http://api/api/v1/progress/?page=2').flush({count: 2, next: null, previous: null, results: [{id: 2}]});
    expect(rows).toEqual([{id: 1}, {id: 2}]);
  });

  it('myProgress returns an un-paginated array as-is', () => {
    let rows: unknown;
    service.myProgress().subscribe((r) => (rows = r));
    http.expectOne(() => true).flush([{id: 7}]);
    expect(rows).toEqual([{id: 7}]);
  });

  it('URL-encodes tokens', () => {
    service.verify('a/b').subscribe();
    service.getInviteByToken('a b').subscribe();
    service.acceptInviteByToken('a b').subscribe();
    service.declineInviteByToken('a b').subscribe();
    const urls = http.match(() => true).map((r) => {
      r.flush({});
      return r.request.url;
    });
    expect(urls[0]).toMatch(/\/verify\/a%2Fb\/$/);
    expect(urls[1]).toMatch(/\/course-invite\/a%20b\/$/);
    expect(urls[2]).toMatch(/\/course-invite\/a%20b\/accept\/$/);
    expect(urls[3]).toMatch(/\/course-invite\/a%20b\/decline\/$/);
  });

  it.each([
    ['approve', (s: EnrollmentService) => s.approve(1), 'POST', '/enrollment/1/approve/', {}],
    ['cancel', (s: EnrollmentService) => s.cancel(1), 'POST', '/enrollment/1/cancel/', {}],
    ['enroll', (s: EnrollmentService) => s.enroll(2), 'POST', '/course/2/enroll/', {}],
    ['startLesson', (s: EnrollmentService) => s.startLesson(3), 'POST', '/lesson/3/start/', {}],
    ['recordLessonProgress', (s: EnrollmentService) => s.recordLessonProgress(3, 55), 'POST', '/lesson/3/progress/', {progress_percent: 55}],
    ['courseAnalytics', (s: EnrollmentService) => s.courseAnalytics(2), 'GET', '/course/2/analytics/', null],
    ['myCertificates', (s: EnrollmentService) => s.myCertificates(), 'GET', '/certificate/', null],
    ['certificate', (s: EnrollmentService) => s.certificate(9), 'GET', '/certificate/9/', null],
    ['getLessonNote', (s: EnrollmentService) => s.getLessonNote(3), 'GET', '/lesson/3/note/', null],
    ['saveLessonNote', (s: EnrollmentService) => s.saveLessonNote(3, 'hi'), 'PUT', '/lesson/3/note/', {content: 'hi'}],
    ['inviteToCourse', (s: EnrollmentService) => s.inviteToCourse(2, 7), 'POST', '/course/2/invite/', {invitee_id: 7}],
    ['bulkInviteToCourse', (s: EnrollmentService) => s.bulkInviteToCourse(2, [7, 8]), 'POST', '/course/2/invite-bulk/', {invitee_ids: [7, 8]}],
    ['resendInvite', (s: EnrollmentService) => s.resendInvite(4), 'POST', '/course-invite/4/resend/', {}],
    ['resendAllPendingInvites', (s: EnrollmentService) => s.resendAllPendingInvites(2), 'POST', '/course/2/invite-bulk-resend/', {}],
    ['revokeInvite', (s: EnrollmentService) => s.revokeInvite(4), 'POST', '/course-invite/4/revoke/', {}],
  ] as const)('%s → %s %s', (_n, call, method, path, body) => {
    (call as (s: EnrollmentService) => Observable<unknown>)(service).subscribe();
    const req = http.expectOne((r) => r.url.endsWith(path));
    expect(req.request.method).toBe(method);
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('downloads the certificate PDF as a blob', () => {
    service.certificatePdf(9).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/certificate/9/pdf/'));
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob());
  });
});
