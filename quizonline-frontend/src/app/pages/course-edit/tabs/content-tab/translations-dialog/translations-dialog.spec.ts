import {TestBed} from '@angular/core/testing';
import {of, Subject, throwError} from 'rxjs';
import {describe, expect, it, beforeEach, vi} from 'vitest';
import {TranslationsDialog} from './translations-dialog';
import {CatalogService} from '../../../../../services/catalog/catalog.service';
import {TranslationService} from '../../../../../services/translation/translation';
import {AppToastService} from '../../../../../shared/toast/app-toast.service';
import {CourseDetailDto} from '../../../../../api/generated/model/course-detail';

const course = {
  id: 1, language_code: 'fr', available_lang_codes: ['fr', 'en'],
  sections: [{id: 10, order: 0, is_published: false,
    translations: {fr: {title: 'S1', description: 'D'}}, lessons: [
      {id: 5, section: 10, order: 0, is_published: false, is_preview: false, translations: {fr: {title: 'L'}}},
    ]}],
} as never as CourseDetailDto;

describe('TranslationsDialog', () => {
  const catalog = {updateSection: vi.fn(), updateLesson: vi.fn(), getSection: vi.fn(), getLesson: vi.fn()};
  const translator = {translateBatch: vi.fn()};
  const toast = {add: vi.fn(), addApiError: vi.fn()};
  beforeEach(() => {
    [catalog.updateSection, catalog.updateLesson, catalog.getSection, catalog.getLesson,
      translator.translateBatch, toast.add, toast.addApiError]
      .forEach((f) => f.mockReset());
    // Fresh server state mirrors the outline row unless a test says otherwise.
    catalog.getSection.mockReturnValue(of({id: 10, is_published: false,
      translations: {fr: {title: 'S1', description: 'D'}}}));
    catalog.getLesson.mockReturnValue(of({id: 5, is_published: false, is_preview: false,
      translations: {fr: {title: 'L'}}}));
    TestBed.configureTestingModule({
      imports: [TranslationsDialog],
      providers: [
        {provide: CatalogService, useValue: catalog},
        {provide: TranslationService, useValue: translator},
        {provide: AppToastService, useValue: toast},
      ],
    });
    TestBed.overrideComponent(TranslationsDialog, {set: {imports: [], template: '<div></div>'}});
  });

  function render(kind: 'section' | 'lesson', id: number) {
    const f = TestBed.createComponent(TranslationsDialog);
    f.componentRef.setInput('course', course);
    f.componentRef.setInput('target', {kind, id});
    f.detectChanges();
    return f;
  }

  it('prefills every course language from the freshly loaded section', () => {
    const f = render('section', 10);
    expect(catalog.getSection).toHaveBeenCalledWith(10);
    const form = f.componentInstance['form']();
    expect(form.translations).toEqual({fr: {title: 'S1', description: 'D'}, en: {title: '', description: ''}});
    expect(form.activeLang).toBe('fr');
  });

  it('shows a loading state, then builds the form from the fresh lesson, not the stale row', () => {
    const fresh = new Subject<unknown>();
    catalog.getLesson.mockReturnValue(fresh);
    const f = render('lesson', 5);
    expect(f.componentInstance['loading']()).toBe(true);
    f.componentInstance['submit']();
    expect(catalog.updateLesson).not.toHaveBeenCalled();

    // The background machine translation filled EN after the outline row was built.
    fresh.next({id: 5, is_published: false, is_preview: false,
      translations: {fr: {title: 'L'}, en: {title: 'L-en'}}});
    expect(f.componentInstance['loading']()).toBe(false);
    expect(f.componentInstance['form']().translations).toEqual({fr: {title: 'L'}, en: {title: 'L-en'}});
  });

  it('sends only the languages the author changed, never an untouched blank', () => {
    catalog.getSection.mockReturnValue(of({id: 10, is_published: false,
      translations: {fr: {title: 'S1', description: 'D'}}}));
    catalog.updateSection.mockReturnValue(of({}));
    const f = render('section', 10);
    // EN stays blank in the form (e.g. still being machine-translated): it must not be sent.
    f.componentInstance['setField']('fr', 'description', 'D2');
    f.componentInstance['submit']();
    expect(catalog.updateSection).toHaveBeenCalledWith(10, {
      is_published: false, translations: {fr: {description: 'D2'}},
    });
  });

  it('omits translations entirely when nothing changed, and patches the row from the response', () => {
    catalog.updateLesson.mockReturnValue(of({translations: {fr: {title: 'L'}, en: {title: 'L-en'}}}));
    const f = render('lesson', 5);
    let saved: CourseDetailDto | null = null;
    f.componentInstance.saved.subscribe((c) => (saved = c));
    f.componentInstance['setPublished'](true);
    f.componentInstance['submit']();
    expect(catalog.updateLesson).toHaveBeenCalledWith(5, {is_published: true, is_preview: false});
    expect(saved!.sections![0].lessons![0].translations).toEqual({fr: {title: 'L'}, en: {title: 'L-en'}});
  });

  it('falls back to the outline row when the fresh load fails', () => {
    catalog.getSection.mockReturnValue(throwError(() => ({status: 500})));
    const f = render('section', 10);
    expect(toast.addApiError).toHaveBeenCalled();
    expect(f.componentInstance['loading']()).toBe(false);
    expect(f.componentInstance['form']().translations['fr']).toEqual({title: 'S1', description: 'D'});
  });

  it('saving a lesson PATCHes it and emits the patched course, then closes', () => {
    catalog.updateLesson.mockReturnValue(of({}));
    const f = render('lesson', 5);
    f.componentInstance['setField']('en', 'title', ' Lesson ');
    f.componentInstance['setPreview'](true);
    let saved: CourseDetailDto | null = null;
    let closed = false;
    f.componentInstance.saved.subscribe((c) => (saved = c));
    f.componentInstance.closed.subscribe(() => (closed = true));
    f.componentInstance['submit']();
    expect(catalog.updateLesson).toHaveBeenCalledWith(5, {
      is_published: false, is_preview: true,
      translations: {en: {title: 'Lesson'}},
    });
    const lesson = saved!.sections![0].lessons![0];
    expect(lesson.translations['en']['title']).toBe('Lesson');
    expect(lesson.is_preview).toBe(true);
    expect(closed).toBe(true);
  });

  it('refuses a blank course-language title', () => {
    const f = render('section', 10);
    f.componentInstance['setField']('fr', 'title', '  ');
    f.componentInstance['submit']();
    expect(catalog.updateSection).not.toHaveBeenCalled();
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({severity: 'warn'}));
  });

  it('keeps the dialog open when the save fails', () => {
    catalog.updateSection.mockReturnValue(throwError(() => ({status: 400})));
    const f = render('section', 10);
    let closed = false;
    f.componentInstance.closed.subscribe(() => (closed = true));
    f.componentInstance['submit']();
    expect(toast.addApiError).toHaveBeenCalled();
    expect(closed).toBe(false);
    expect(f.componentInstance['form']().submitting).toBe(false);
  });

  it('translate fills only the blank languages from the active tab', async () => {
    translator.translateBatch.mockResolvedValue({title: 'S1-en', description: 'D-en'});
    const f = render('section', 10);
    await f.componentInstance['translateFromActiveTab']();
    expect(translator.translateBatch).toHaveBeenCalledTimes(1);
    expect(translator.translateBatch.mock.calls[0][1]).toBe('en');
    expect(f.componentInstance['form']().translations['en']).toEqual({title: 'S1-en', description: 'D-en'});
  });
});
