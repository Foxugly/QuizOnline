import {TestBed} from '@angular/core/testing';
import {of, throwError} from 'rxjs';
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
  const catalog = {updateSection: vi.fn(), updateLesson: vi.fn()};
  const translator = {translateBatch: vi.fn()};
  const toast = {add: vi.fn(), addApiError: vi.fn()};
  beforeEach(() => {
    [catalog.updateSection, catalog.updateLesson, translator.translateBatch, toast.add, toast.addApiError]
      .forEach((f) => f.mockReset());
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

  it('prefills every course language from the row', () => {
    const f = render('section', 10);
    const form = f.componentInstance['form']();
    expect(form.translations).toEqual({fr: {title: 'S1', description: 'D'}, en: {title: '', description: ''}});
    expect(form.activeLang).toBe('fr');
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
      translations: {fr: {title: 'L'}, en: {title: 'Lesson'}},
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
