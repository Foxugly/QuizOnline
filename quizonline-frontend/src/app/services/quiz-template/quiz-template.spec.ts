import {provideHttpClient, withXhr} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {Observable} from 'rxjs';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {QuizTemplateListDto} from '../../api/generated/model/quiz-template-list';
import {QuizTemplateService} from './quiz-template';

const templates = [
  {id: 1, domain: 3},
  {id: 2, domain: 4},
  {id: 3, domain: 3},
];

describe('QuizTemplateService', () => {
  let service: QuizTemplateService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideHttpClient(withXhr()), provideHttpClientTesting()]});
    service = TestBed.inject(QuizTemplateService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  const isList = (r: {url: string; method: string}) => r.method === 'GET' && r.url.endsWith('/quiz/template/');

  function pick(domainId: number | null): number[] | undefined {
    let out: QuizTemplateListDto[] | undefined;
    service.listForPicker(domainId).subscribe((r) => (out = r));
    return out?.map((t) => t.id);
  }

  describe('listForPicker', () => {
    it('scopes to the domain and caches per key', () => {
      let out: QuizTemplateListDto[] | undefined;
      service.listForPicker(3).subscribe((r) => (out = r));
      http.expectOne(isList).flush({results: templates});
      expect(out?.map((t) => t.id)).toEqual([1, 3]);

      expect(pick(3)).toEqual([1, 3]);
      http.expectNone(isList);

      // a different key (all domains) is fetched separately
      service.listForPicker(null).subscribe((r) => (out = r));
      http.expectOne(isList).flush({results: templates});
      expect(out).toHaveLength(3);
      expect(pick(null)).toEqual([1, 2, 3]);
    });

    it('refetches once the cache is stale', () => {
      vi.useFakeTimers();
      service.listForPicker(4).subscribe();
      http.expectOne(isList).flush({});
      vi.advanceTimersByTime(60_001);
      service.listForPicker(4).subscribe();
      http.expectOne(isList).flush({results: templates});
      expect(pick(4)).toEqual([2]);
    });

    it.each([
      ['create', (s: QuizTemplateService) => s.create({} as never), 'POST'],
      ['update', (s: QuizTemplateService) => s.update(1, {} as never), 'PUT'],
      ['partialUpdate', (s: QuizTemplateService) => s.partialUpdate(1, {}), 'PATCH'],
      ['destroy', (s: QuizTemplateService) => s.destroy(1), 'DELETE'],
    ] as const)('%s invalidates the picker cache', (_n, call, method) => {
      service.listForPicker(3).subscribe();
      http.expectOne(isList).flush({results: templates});

      (call as (s: QuizTemplateService) => Observable<unknown>)(service).subscribe();
      http.expectOne((r) => r.method === method).flush({});

      service.listForPicker(3).subscribe();
      http.expectOne(isList).flush({results: []});
    });
  });

  it('list and listQuestions unwrap results', () => {
    let list: unknown;
    let questions: unknown;
    service.list().subscribe((r) => (list = r));
    http.expectOne(isList).flush({});
    service.listQuestions(5).subscribe((r) => (questions = r));
    http.expectOne((r) => r.url.endsWith('/quiz/template/5/question/')).flush({results: [{id: 9}]});
    expect(list).toEqual([]);
    expect(questions).toEqual([{id: 9}]);
  });

  it('question endpoints target the template / question pair', () => {
    service.retrieve(5).subscribe();
    service.addQuestion(5, {} as never).subscribe();
    service.updateQuestion(5, 8, {} as never).subscribe();
    service.removeQuestion(5, 8).subscribe();
    const reqs = http.match(() => true);
    expect(reqs.map((r) => `${r.request.method} ${r.request.url.replace(/^.*\/api\/v1/, '')}`)).toEqual([
      'GET /quiz/template/5/',
      'POST /quiz/template/5/question/',
      'PUT /quiz/template/5/question/8/',
      'DELETE /quiz/template/5/question/8/',
    ]);
    reqs.forEach((r) => r.flush({}));
  });
});
