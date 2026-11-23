import {provideHttpClient, withXhr} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {afterEach, beforeEach, describe, expect, it, MockInstance, vi} from 'vitest';

import {QuizListDto} from '../../api/generated/model/quiz-list';
import {QuizService} from './quiz';

describe('QuizService', () => {
  let service: QuizService;
  let http: HttpTestingController;
  let navigate: MockInstance<Router['navigate']>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(QuizService);
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  const isQuizList = (r: {url: string; method: string}) => r.method === 'GET' && /\/api\/v1\/quiz\/$/.test(r.url);

  describe('listQuiz', () => {
    it('walks every page', () => {
      let out: QuizListDto[] | undefined;
      service.listQuiz().subscribe((r) => (out = r));
      const p1 = http.expectOne(isQuizList);
      expect(p1.request.params.get('page')).toBe('1');
      p1.flush({next: 'x', results: [{id: 1}]});
      const p2 = http.expectOne(isQuizList);
      expect(p2.request.params.get('page')).toBe('2');
      p2.flush({next: null});
      expect(out?.map((q) => q.id)).toEqual([1]);
    });

    it('shares one in-flight unfiltered walk between concurrent callers', () => {
      const a: QuizListDto[][] = [];
      service.listQuiz().subscribe((r) => a.push(r));
      service.listQuiz().subscribe((r) => a.push(r));
      http.expectOne(isQuizList).flush({next: null, results: [{id: 3}]});
      expect(a).toHaveLength(2);

      // once completed, the next call refetches
      service.listQuiz().subscribe();
      http.expectOne(isQuizList).flush({next: null, results: []});
    });

    it('does not share filtered searches', () => {
      service.listQuiz({search: 'x'}).subscribe();
      service.listQuiz({name: 'y'}).subscribe();
      const reqs = http.match(isQuizList);
      expect(reqs).toHaveLength(2);
      expect(reqs[0].request.params.get('search')).toBe('x');
      expect(reqs[1].request.params.get('name')).toBe('y');
      reqs.forEach((r) => r.flush({next: null, results: []}));
    });
  });

  describe('getQuestionCountBySubjects', () => {
    it('short-circuits an empty selection', () => {
      let out: {count: number} | undefined;
      service.getQuestionCountBySubjects([]).subscribe((r) => (out = r));
      expect(out).toEqual({count: 0});
    });

    it('counts active practice questions with a one-row page', () => {
      let out: {count: number} | undefined;
      service.getQuestionCountBySubjects([4]).subscribe((r) => (out = r));
      const req = http.expectOne((r) => r.url.endsWith('/api/v1/question/'));
      expect(req.request.params.get('page_size')).toBe('1');
      expect(req.request.params.get('active')).toBe('true');
      expect(req.request.params.get('is_mode_practice')).toBe('true');
      req.flush({count: 17, results: []});
      expect(out).toEqual({count: 17});
    });
  });

  it('generateQuiz creates the template then a quiz from it', () => {
    let quizId: number | undefined;
    service.generateQuiz({} as never).subscribe((q) => (quizId = q.id));
    http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/quiz/template/generate-from-subjects/')).flush({id: 77});
    const create = http.expectOne((r) => r.method === 'POST' && /\/api\/v1\/quiz\/$/.test(r.url));
    expect(create.request.body).toEqual({quiz_template_id: 77});
    create.flush({id: 5});
    expect(quizId).toBe(5);
  });

  describe('goStart', () => {
    it('navigates to the questions of the started session', () => {
      service.goStart(9);
      http.expectOne((r) => r.url.endsWith('/quiz/9/start/')).flush({id: 12});
      expect(navigate).toHaveBeenCalledWith(['/quiz', 12, 'questions']);
    });

    it('hands errors to the callback when given', () => {
      const onError = vi.fn();
      service.goStart(9, onError);
      http.expectOne((r) => r.url.endsWith('/quiz/9/start/')).flush('no', {status: 409, statusText: 'Conflict'});
      expect(onError).toHaveBeenCalledTimes(1);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('logs errors without a callback', () => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      service.goStart(9);
      http.expectOne((r) => r.url.endsWith('/quiz/9/start/')).flush('no', {status: 500, statusText: 'x'});
      expect(log).toHaveBeenCalled();
      log.mockRestore();
    });
  });

  it('listTemplateSessions accepts a bare array or a paginated envelope', () => {
    const out: unknown[] = [];
    service.listTemplateSessions(3).subscribe((r) => out.push(r));
    http.expectOne((r) => r.url.endsWith('/quiz/template/3/sessions/')).flush([{id: 1}]);
    service.listTemplateSessions(3).subscribe((r) => out.push(r));
    http.expectOne((r) => r.url.endsWith('/quiz/template/3/sessions/')).flush({results: [{id: 2}]});
    service.listTemplateSessions(3).subscribe((r) => out.push(r));
    http.expectOne((r) => r.url.endsWith('/quiz/template/3/sessions/')).flush({});
    expect(out).toEqual([[{id: 1}], [{id: 2}], []]);
  });

  it('saveAnswer refuses a payload without question_id', () => {
    expect(() => service.saveAnswer(1, {} as never)).toThrow('question_id is required');
    service.saveAnswer(1, {question_id: 4} as never).subscribe();
    const req = http.expectOne((r) => r.method === 'POST' && r.url.includes('/quiz/1/'));
    expect(req.request.body).toEqual({question_id: 4});
    req.flush({});
  });

  it('unwraps paginated templates and answers', () => {
    let templates: unknown;
    let answers: unknown;
    service.listTemplates().subscribe((r) => (templates = r));
    http.expectOne((r) => r.url.endsWith('/quiz/template/')).flush({});
    service.listAnswers(2).subscribe((r) => (answers = r));
    http.expectOne((r) => r.url.includes('/quiz/2/')).flush({results: [{id: 1}]});
    expect(templates).toEqual([]);
    expect(answers).toEqual([{id: 1}]);
  });

  it('assigns a template to users in bulk', () => {
    service.assignTemplateToUsers(3, [1, 2]).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/quiz/bulk-create-from-template/'));
    expect(req.request.body).toEqual({quiz_template_id: 3, user_ids: [1, 2]});
    req.flush([]);
  });

  it('plain quiz endpoints', () => {
    service.closeQuiz(1).subscribe();
    service.deleteQuiz(1).subscribe();
    service.retrieveQuiz(1).subscribe();
    service.exportPdf(1).subscribe();
    const reqs = http.match(() => true);
    expect(reqs.map((r) => `${r.request.method} ${r.request.url.replace(/^.*\/api\/v1/, '')}`)).toEqual([
      'POST /quiz/1/close/',
      'DELETE /quiz/1/',
      'GET /quiz/1/',
      'GET /quiz/1/export-pdf/',
    ]);
    reqs.forEach((r) => r.flush(null));
  });

  it('navigation helpers', () => {
    service.goList();
    service.goView(4);
    service.goCompose();
    service.goQuickQuiz();
    expect(navigate.mock.calls.map((c) => c[0])).toEqual([
      ['/quiz', 'list'],
      ['/quiz', 4],
      ['/quiz', 'add'],
      ['/quiz/quick'],
    ]);
  });
});
