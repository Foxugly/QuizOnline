import {TestBed} from '@angular/core/testing';
import {of, Subject, throwError} from 'rxjs';
import {describe, expect, it, beforeEach, vi} from 'vitest';
import {CourseOutline} from './course-outline';
import {CatalogService} from '../../../../../services/catalog/catalog.service';
import {CourseDetailDto} from '../../../../../api/generated/model/course-detail';

const course = {
  id: 1, language_code: 'fr', available_lang_codes: ['fr', 'en'],
  sections: [{id: 10, order: 0, is_published: false, translations: {fr: {title: 'S1'}}, lessons: []}],
} as never;

const withLesson = {
  id: 1, language_code: 'fr', available_lang_codes: ['fr'],
  sections: [{id: 10, order: 0, is_published: false, translations: {fr: {title: 'S1'}}, lessons: [
    {id: 5, section: 10, order: 0, is_published: true, is_preview: true, translations: {fr: {title: 'L'}}},
  ]}],
} as never;

const twoSections = {
  id: 1, language_code: 'fr', available_lang_codes: ['fr'],
  sections: [
    {id: 10, order: 0, is_published: false, translations: {fr: {title: 'S1'}}, lessons: [
      {id: 5, section: 10, order: 0, is_published: false, is_preview: false, translations: {fr: {title: 'L5'}}},
      {id: 6, section: 10, order: 1, is_published: false, is_preview: false, translations: {fr: {title: 'L6'}}},
    ]},
    {id: 20, order: 1, is_published: false, translations: {fr: {title: 'S2'}}, lessons: []},
  ],
} as unknown as CourseDetailDto;

/** Hand-built ``CdkDragDrop`` for a lesson drop between two section lists. */
const lessonDrop = (from: number, to: number, previousIndex: number, currentIndex: number, lessonId: number) => ({
  previousContainer: {data: {sectionId: from}},
  container: {data: {sectionId: to}},
  previousIndex, currentIndex,
  item: {data: lessonId},
}) as never;

describe('CourseOutline', () => {
  const catalog = {
    createLesson: vi.fn(), createSection: vi.fn(), updateLesson: vi.fn(), updateSection: vi.fn(),
    moveLesson: vi.fn(), reorderLessons: vi.fn(), reorderSections: vi.fn(),
  };
  beforeEach(() => {
    Object.values(catalog).forEach((f) => f.mockReset());
    TestBed.configureTestingModule({imports: [CourseOutline], providers: [{provide: CatalogService, useValue: catalog}]});
  });

  function render() {
    const f = TestBed.createComponent(CourseOutline);
    f.componentRef.setInput('course', course);
    f.componentRef.setInput('selectedLessonId', null);
    f.detectChanges();
    return f;
  }

  function typeAndPress(f: ReturnType<typeof render>, testId: string, text: string, key: string) {
    (f.nativeElement.querySelector(`[data-testid="${testId}-open"]`) as HTMLButtonElement).click();
    f.detectChanges();
    const input = f.nativeElement.querySelector(`[data-testid="${testId}-input"]`) as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', {key}));
    f.detectChanges();
  }

  it('Enter creates the lesson in the course language and selects it', () => {
    catalog.createLesson.mockReturnValue(of({id: 99, section: 10, order: 0, is_published: false, is_preview: false, translations: {fr: {title: 'L1'}}}));
    const f = render();
    let selected = 0;
    f.componentInstance.lessonSelect.subscribe((id: number) => (selected = id));
    typeAndPress(f, 'add-lesson-10', '  L1 ', 'Enter');
    expect(catalog.createLesson).toHaveBeenCalledWith({section: 10, translations: {fr: {title: 'L1'}}});
    expect(selected).toBe(99);
  });

  it('Escape cancels and empty titles send nothing', () => {
    const f = render();
    typeAndPress(f, 'add-lesson-10', 'X', 'Escape');
    typeAndPress(f, 'add-lesson-10', '   ', 'Enter');
    expect(catalog.createLesson).not.toHaveBeenCalled();
  });

  it('a second Enter while the first create is in flight sends nothing', () => {
    const pending = new Subject<unknown>();
    catalog.createLesson.mockReturnValue(pending);
    const f = render();
    typeAndPress(f, 'add-lesson-10', 'L1', 'Enter');
    const input = f.nativeElement.querySelector('[data-testid="add-lesson-10-input"]') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
    expect(catalog.createLesson).toHaveBeenCalledTimes(1);
  });

  it('keeps the typed text when the create fails', () => {
    catalog.createLesson.mockReturnValue(throwError(() => ({error: {detail: 'nope'}})));
    const f = render();
    typeAndPress(f, 'add-lesson-10', 'L1', 'Enter');
    const input = f.nativeElement.querySelector('[data-testid="add-lesson-10-input"]') as HTMLInputElement;
    expect(input.value).toBe('L1');
  });

  it('rename with a blank title sends nothing', () => {
    const f = render();
    (f.nativeElement.querySelector('[data-testid="rename-section-10"]') as HTMLElement).dispatchEvent(new Event('dblclick'));
    f.detectChanges();
    const input = f.nativeElement.querySelector('[data-testid="rename-section-10-input"]') as HTMLInputElement;
    input.value = '  ';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
    expect(catalog.updateSection).not.toHaveBeenCalled();
  });

  it('Enter creates a section and opens the lesson input inside it', () => {
    catalog.createSection.mockReturnValue(of({id: 11, order: 1, is_published: false, translations: {fr: {title: 'S2'}}, lessons: []}));
    const f = render();
    const emitted: CourseDetailDto[] = [];
    f.componentInstance.courseChange.subscribe((c) => emitted.push(c));
    typeAndPress(f, 'add-section', 'S2', 'Enter');
    expect(catalog.createSection).toHaveBeenCalledWith({course: 1, translations: {fr: {title: 'S2'}}});
    expect(emitted.at(-1)?.sections.map((s) => s.id)).toEqual([10, 11]);
    expect(f.nativeElement.querySelector('[data-testid="add-lesson-11-input"]')).not.toBeNull();
  });

  it('rename sends the trimmed title in the course language and shows it', () => {
    catalog.updateSection.mockReturnValue(of({id: 10, translations: {fr: {title: 'Intro'}}}));
    const f = render();
    (f.nativeElement.querySelector('[data-testid="rename-section-10"]') as HTMLElement).dispatchEvent(new Event('dblclick'));
    f.detectChanges();
    const input = f.nativeElement.querySelector('[data-testid="rename-section-10-input"]') as HTMLInputElement;
    expect(input.value).toBe('S1');
    input.value = ' Intro ';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
    f.detectChanges();
    expect(catalog.updateSection).toHaveBeenCalledWith(10, {translations: {fr: {title: 'Intro'}}});
    expect((f.nativeElement.querySelector('[data-testid="rename-section-10"]') as HTMLElement).textContent).toContain('Intro');
  });

  it('shows the languages whose title is still empty', () => {
    const f = render();
    expect((f.nativeElement.querySelector('.outline-row__missing') as HTMLElement).textContent).toContain('EN');
  });

  it('the pencil opens the rename input without selecting the lesson', () => {
    const f = TestBed.createComponent(CourseOutline);
    f.componentRef.setInput('course', withLesson);
    f.detectChanges();
    let selected = 0;
    f.componentInstance.lessonSelect.subscribe((id: number) => (selected = id));
    (f.nativeElement.querySelector('[data-testid="rename-lesson-5-open"] button') as HTMLButtonElement).click();
    f.detectChanges();
    expect(f.nativeElement.querySelector('[data-testid="rename-lesson-5-input"]')).not.toBeNull();
    expect(selected).toBe(0);
    (f.nativeElement.querySelector('[data-testid="rename-section-10-open"] button') as HTMLButtonElement).click();
    f.detectChanges();
    expect(f.nativeElement.querySelector('[data-testid="rename-section-10-input"]')).not.toBeNull();
  });

  it('shows the free-preview badge on preview lessons', () => {
    const f = TestBed.createComponent(CourseOutline);
    f.componentRef.setInput('course', withLesson);
    f.detectChanges();
    expect((f.nativeElement.querySelector('[data-testid="preview-lesson-5"]') as HTMLElement).textContent).toContain('Free preview');
  });

  function renderTwo() {
    const f = TestBed.createComponent(CourseOutline);
    f.componentRef.setInput('course', twoSections);
    f.detectChanges();
    const emitted: CourseDetailDto[] = [];
    f.componentInstance.courseChange.subscribe((c) => emitted.push(c));
    const drop = (e: never) => (f.componentInstance as unknown as Record<string, (e: never) => void>)['onLessonDrop'](e);
    return {f, emitted, drop};
  }

  const lessonIds = (c: CourseDetailDto | undefined) => c?.sections.map((s) => [s.id, (s.lessons ?? []).map((l) => l.id)]);

  it('a cross-section drop calls move and rolls back on error', () => {
    catalog.moveLesson.mockReturnValue(throwError(() => ({error: {detail: 'x'}})));
    const {f, emitted, drop} = renderTwo();
    drop(lessonDrop(10, 20, 0, 0, 5));
    f.detectChanges();
    expect(catalog.moveLesson).toHaveBeenCalledWith(5, 20, 0);
    // optimistic copy first, then the original sections back
    expect(lessonIds(emitted[0])).toEqual([[10, [6]], [20, [5]]]);
    expect(emitted.at(-1)?.sections).toEqual(twoSections.sections);
    expect(f.nativeElement.querySelector('[data-testid="lesson-5"]')).not.toBeNull();
    expect((f.nativeElement.querySelectorAll('.outline-section')[0] as HTMLElement).querySelector('[data-testid="lesson-5"]')).not.toBeNull();
  });

  it('a cross-section drop patches both sections from the response', () => {
    catalog.moveLesson.mockReturnValue(of({
      lesson: {id: 5, section: 20, order: 0},
      source_section: {id: 10, order: 0, is_published: true, translations: {fr: {title: 'S1'}},
        lessons: [{id: 6, section: 10, order: 0, is_published: false, is_preview: false, translations: {fr: {title: 'L6'}}}]},
      target_section: {id: 20, order: 1, is_published: false, translations: {fr: {title: 'S2'}},
        lessons: [{id: 5, section: 20, order: 0, is_published: false, is_preview: false, translations: {fr: {title: 'L5'}}}]},
    }));
    const {f, emitted, drop} = renderTwo();
    drop(lessonDrop(10, 20, 0, 0, 5));
    f.detectChanges();
    const last = emitted.at(-1);
    expect(lessonIds(last)).toEqual([[10, [6]], [20, [5]]]);
    expect(last?.sections[0].is_published).toBe(true);
    expect((f.nativeElement.querySelectorAll('.outline-section')[1] as HTMLElement).querySelector('[data-testid="lesson-5"]')).not.toBeNull();
  });

  it('a drop within a section reorders the lessons', () => {
    catalog.reorderLessons.mockReturnValue(of({}));
    const {emitted, drop} = renderTwo();
    drop(lessonDrop(10, 10, 0, 1, 5));
    expect(catalog.reorderLessons).toHaveBeenCalledWith(10, [6, 5]);
    expect(catalog.moveLesson).not.toHaveBeenCalled();
    expect(lessonIds(emitted.at(-1))).toEqual([[10, [6, 5]], [20, []]]);
  });

  it('a drop at the same place sends nothing', () => {
    const {emitted, drop} = renderTwo();
    drop(lessonDrop(10, 10, 1, 1, 6));
    expect(catalog.reorderLessons).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  it('a section drop reorders the sections and rolls back on error', () => {
    catalog.reorderSections.mockReturnValue(throwError(() => ({error: {detail: 'x'}})));
    const {f, emitted} = renderTwo();
    (f.componentInstance as unknown as Record<string, (e: never) => void>)['onSectionDrop']({previousIndex: 1, currentIndex: 0} as never);
    expect(catalog.reorderSections).toHaveBeenCalledWith(1, [20, 10]);
    expect(emitted[0].sections.map((s) => [s.id, s.order])).toEqual([[20, 0], [10, 1]]);
    expect(emitted.at(-1)?.sections).toEqual(twoSections.sections);
  });

  it('renders a labelled drag handle per section and per lesson', () => {
    const {f} = renderTwo();
    const handles = f.nativeElement.querySelectorAll('[cdkdraghandle], .cdk-drag-handle');
    expect(handles.length).toBe(4);
    expect((handles[0] as HTMLElement).getAttribute('aria-label')).toBe('Drag to reorder');
  });
});
