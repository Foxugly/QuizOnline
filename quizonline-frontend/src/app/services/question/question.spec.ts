import {HttpHeaders, provideHttpClient, withXhr} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {Observable} from 'rxjs';
import {afterEach, beforeEach, describe, expect, it, MockInstance, vi} from 'vitest';

import {QuestionReadDto} from '../../api/generated/model/question-read';
import {QuestionService} from './question';

describe('QuestionService', () => {
  let service: QuestionService;
  let http: HttpTestingController;
  let navigate: MockInstance<Router['navigate']>;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(QuestionService);
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  describe('list', () => {
    it('walks every page and concatenates the results', () => {
      let result: QuestionReadDto[] | undefined;
      service.list({domainId: 3, active: true}).subscribe((r) => (result = r));

      const first = http.expectOne((r) => r.url.endsWith('/api/v1/question/') && r.params.get('page') === '1');
      expect(first.request.params.get('domain')).toBe('3');
      expect(first.request.params.get('active')).toBe('true');
      expect(first.request.params.get('page_size')).toBe('100');
      first.flush({count: 3, next: 'more', results: [{id: 1}, {id: 2}]});

      const second = http.expectOne((r) => r.params.get('page') === '2');
      second.flush({count: 3, next: null, results: [{id: 3}]});

      expect(result?.map((q) => q.id)).toEqual([1, 2, 3]);
    });

    it('treats a missing results array as empty', () => {
      let result: QuestionReadDto[] | undefined;
      service.list().subscribe((r) => (result = r));
      http.expectOne(() => true).flush({count: 0, next: null});
      expect(result).toEqual([]);
    });
  });

  describe('listPage subject filter', () => {
    it('prefers subjectIds over subjectId', () => {
      service.listPage({subjectIds: [4, 5], subjectId: 9}).subscribe();
      const req = http.expectOne(() => true);
      expect(req.request.params.getAll('subject_ids')?.join(',')).toContain('4');
      expect(req.request.params.toString()).not.toContain('9');
      req.flush({results: []});
    });

    it('falls back to the single subjectId', () => {
      service.listPage({subjectIds: [], subjectId: 9}).subscribe();
      const req = http.expectOne(() => true);
      expect(req.request.params.toString()).toContain('subject_ids=9');
      req.flush({results: []});
    });

    it('sends no subject filter when none is given', () => {
      service.listPage({search: 'x'}).subscribe();
      const req = http.expectOne(() => true);
      expect(req.request.params.has('subject_ids')).toBe(false);
      expect(req.request.params.get('search')).toBe('x');
      req.flush({results: []});
    });
  });

  it.each([
    ['retrieve', () => TestBed.inject(QuestionService).retrieve(5), 'GET', '/question/5/'],
    ['create', () => TestBed.inject(QuestionService).create({} as never), 'POST', '/question/'],
    ['update', () => TestBed.inject(QuestionService).update(5, {} as never), 'PUT', '/question/5/'],
    ['updatePartial', () => TestBed.inject(QuestionService).updatePartial(5, {}), 'PATCH', '/question/5/'],
    ['delete', () => TestBed.inject(QuestionService).delete(5), 'DELETE', '/question/5/'],
  ] as const)('%s hits %s %s', (_name, call, method, path) => {
    (call as () => Observable<unknown>)().subscribe();
    const req = http.expectOne((r) => r.url.endsWith(path));
    expect(req.request.method).toBe(method);
    req.flush({});
  });

  describe('navigation', () => {
    it('goNew carries the domain id only when given', () => {
      service.goNew(7);
      expect(navigate).toHaveBeenLastCalledWith(expect.anything(), {queryParams: {domainId: 7}});
      service.goNew();
      expect(navigate).toHaveBeenLastCalledWith(expect.anything(), {queryParams: undefined});
    });

    it('routes the helpers to their pages', () => {
      service.goList();
      service.goImport();
      service.goEdit(3);
      service.goView(3);
      service.goDelete(3);
      service.goBack();
      service.goSubjectEdit(8);
      const targets = navigate.mock.calls.map((c: unknown[]) => (c[0] as unknown[]).join('/'));
      expect(targets).toHaveLength(7);
      expect(targets[2]).toContain('3');
      expect(targets[6]).toContain('8');
      expect(targets[0]).toBe(targets[5]);
    });
  });

  describe('duplicate draft', () => {
    const question = {
      id: 10,
      domain: {id: 2},
      subjects: [{id: 5}, {id: 6}],
      active: true,
      is_mode_practice: false,
      is_mode_exam: undefined,
      translations: {fr: {title: 'Bonjour'}, en: {}},
      answer_options: [
        {id: 30, is_correct: false, sort_order: 2},
        {id: 20, is_correct: true, sort_order: undefined},
        {id: 40, is_correct: undefined, sort_order: 1},
      ],
    } as unknown as QuestionReadDto;

    it('builds a draft, persists it and navigates to the new-question page', () => {
      service.duplicateToNew(question);

      expect(navigate).toHaveBeenCalledWith(expect.anything(), {queryParams: {domainId: 2}});
      const draft = service.consumeDuplicateDraft();
      expect(draft).toEqual({
        domainId: 2,
        subjectIds: [5, 6],
        active: true,
        isModePractice: false,
        isModeExam: false,
        translations: {fr: {title: 'Bonjour'}, en: {title: ''}},
        // sorted by sort_order, falling back to the id (1, 2, 20)
        answerOptions: [
          {is_correct: false, sort_order: 1},
          {is_correct: false, sort_order: 2},
          {is_correct: true, sort_order: 3},
        ],
      });
    });

    it('is consumed only once', () => {
      service.duplicateToNew(question);
      expect(service.consumeDuplicateDraft()).not.toBeNull();
      expect(service.consumeDuplicateDraft()).toBeNull();
      expect(sessionStorage.getItem('question.duplicateDraft')).toBeNull();
    });

    it('survives a reload through sessionStorage', () => {
      service.duplicateToNew(question);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([])],
      });
      const fresh = TestBed.inject(QuestionService);
      http = TestBed.inject(HttpTestingController);
      expect(fresh.consumeDuplicateDraft()?.domainId).toBe(2);
    });

    it('drops a corrupt persisted draft', () => {
      sessionStorage.setItem('question.duplicateDraft', '{not json');
      expect(service.consumeDuplicateDraft()).toBeNull();
      expect(sessionStorage.getItem('question.duplicateDraft')).toBeNull();
    });
  });

  describe('getQuestionTranslationForm', () => {
    it('returns the requested language', () => {
      const q = {translations: {fr: {title: 'FR'}, en: {title: 'EN'}}} as unknown as QuestionReadDto;
      expect(service.getQuestionTranslationForm(q, 'en' as never)).toEqual({title: 'EN'});
    });

    it('returns an empty title when there are no translations', () => {
      const q = {translations: undefined} as unknown as QuestionReadDto;
      expect(service.getQuestionTranslationForm(q, 'en' as never)).toEqual({title: ''});
    });
  });

  describe('exportStructured', () => {
    it('sends the ids and uses the filename from Content-Disposition', () => {
      let out: {blob: Blob; filename: string} | undefined;
      service.exportStructured(3, [1, 2]).subscribe((r) => (out = r));
      const req = http.expectOne((r) => r.url.endsWith('/question/export-structured/'));
      expect(req.request.params.get('domain')).toBe('3');
      expect(req.request.params.get('ids')).toBe('1,2');
      const blob = new Blob(['{}']);
      req.flush(blob, {headers: new HttpHeaders({'Content-Disposition': 'attachment; filename="qs.json"'})});
      expect(out).toEqual({blob, filename: 'qs.json'});
    });

    it('falls back to a domain-based filename and omits empty ids', () => {
      let out: {blob: Blob; filename: string} | undefined;
      service.exportStructured(3, []).subscribe((r) => (out = r));
      const req = http.expectOne((r) => r.url.endsWith('/question/export-structured/'));
      expect(req.request.params.has('ids')).toBe(false);
      req.flush(new Blob([]));
      expect(out?.filename).toBe('questions-domain-3');
    });
  });

  it('imports a structured payload as JSON or as a file upload', () => {
    service.importStructured({version: '1.0'} as never).subscribe();
    const json = http.expectOne((r) => r.url.endsWith('/question/import-structured/'));
    expect(json.request.body).toEqual({version: '1.0'});
    json.flush({});

    const file = new File(['{}'], 'q.json');
    service.importStructuredFormData(file).subscribe();
    const form = http.expectOne((r) => r.url.endsWith('/question/import-structured/'));
    expect((form.request.body as FormData).get('json_file')).toBeInstanceOf(File);
    form.flush({});
  });
});
