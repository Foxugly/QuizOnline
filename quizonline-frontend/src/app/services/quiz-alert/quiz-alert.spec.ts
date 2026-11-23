import {provideHttpClient, withXhr} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {QuizAlertService} from './quiz-alert';

describe('QuizAlertService', () => {
  let service: QuizAlertService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideHttpClient(withXhr()), provideHttpClientTesting()]});
    service = TestBed.inject(QuizAlertService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list accepts a bare array or a paginated envelope', () => {
    const out: unknown[] = [];
    service.list().subscribe((r) => out.push(r));
    http.expectOne((r) => r.url.endsWith('/quiz/alerts/')).flush([{id: 1}]);
    service.list().subscribe((r) => out.push(r));
    http.expectOne((r) => r.url.endsWith('/quiz/alerts/')).flush({results: [{id: 2}]});
    service.list().subscribe((r) => out.push(r));
    http.expectOne((r) => r.url.endsWith('/quiz/alerts/')).flush({});
    expect(out).toEqual([[{id: 1}], [{id: 2}], []]);
  });

  it('refreshUnreadCount stores the server count, defaulting to 0', () => {
    service.refreshUnreadCount().subscribe();
    http.expectOne((r) => r.url.endsWith('/quiz/alerts/unread-count/')).flush({count: 4});
    expect(service.unreadCount()).toBe(4);
    service.refreshUnreadCount().subscribe();
    http.expectOne((r) => r.url.endsWith('/quiz/alerts/unread-count/')).flush({});
    expect(service.unreadCount()).toBe(0);
  });

  it('setUnread clamps negatives and ignores non-finite values', () => {
    service.setUnread(3);
    expect(service.unreadCount()).toBe(3);
    service.setUnread(-2);
    expect(service.unreadCount()).toBe(0);
    service.setUnread(Number.NaN);
    expect(service.unreadCount()).toBe(0);
    service.setUnread(5);
    service.clearUnreadCount();
    expect(service.unreadCount()).toBe(0);
  });

  it('thread actions hit the alert endpoints', () => {
    service.retrieve(7).subscribe();
    service.create({quiz_id: 1, question_id: 2, body: 'typo'}).subscribe();
    service.postMessage(7, 'hello').subscribe();
    service.update(7, {reporter_reply_allowed: false}).subscribe();
    service.close(7).subscribe();
    service.reopen(7).subscribe();
    const reqs = http.match(() => true);
    expect(
      reqs.map((r) => [r.request.method, r.request.url.replace(/^.*\/quiz\/alerts/, ''), r.request.body]),
    ).toEqual([
      ['GET', '/7/', null],
      ['POST', '/', {quiz_id: 1, question_id: 2, body: 'typo'}],
      ['POST', '/7/message/', {body: 'hello'}],
      ['PATCH', '/7/', {reporter_reply_allowed: false}],
      ['POST', '/7/close/', {}],
      ['POST', '/7/reopen/', {}],
    ]);
    reqs.forEach((r) => r.flush({}));
  });
});
