import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, Router} from '@angular/router';
import {BehaviorSubject} from 'rxjs';
import {afterEach, describe, expect, it, beforeEach, vi} from 'vitest';
import {CourseEditContentTab} from './content-tab';
import {SKIP_UNSAVED_GUARD} from '../../unsaved-changes.guard';
import {AppToastService} from '../../../../shared/toast/app-toast.service';
import {CourseDetailDto} from '../../../../api/generated/model/course-detail';

const course = {id: 1, language_code: 'fr', available_lang_codes: ['fr'],
  sections: [{id: 10, order: 0, translations: {fr: {title: 'S'}}, lessons: [
    {id: 5, section: 10, order: 0, is_published: false, is_preview: false, translations: {fr: {title: 'L'}}}]}]} as never;

describe('CourseEditContentTab', () => {
  const query = new BehaviorSubject(convertToParamMap({tab: 'content'}));
  const router = {navigate: vi.fn()};
  const toast = {add: vi.fn(), addApiError: vi.fn()};
  beforeEach(() => {
    router.navigate.mockReset();
    toast.add.mockReset();
    query.next(convertToParamMap({tab: 'content'}));
    TestBed.configureTestingModule({
      imports: [CourseEditContentTab],
      providers: [
        {provide: ActivatedRoute, useValue: {queryParamMap: query}},
        {provide: Router, useValue: router},
        {provide: AppToastService, useValue: toast},
      ],
    });
    TestBed.overrideComponent(CourseEditContentTab, {set: {imports: [], template: '<div></div>'}});
  });

  function render() {
    const f = TestBed.createComponent(CourseEditContentTab);
    f.componentRef.setInput('course', course);
    f.detectChanges();
    return f;
  }

  it('reads the selected lesson from ?lesson=', () => {
    query.next(convertToParamMap({tab: 'content', lesson: '5'}));
    const f = render();
    expect(f.componentInstance['selectedLessonId']()).toBe(5);
    expect(toast.add).not.toHaveBeenCalled();
  });

  it('ignores a lesson that is not in the course', () => {
    query.next(convertToParamMap({tab: 'content', lesson: '999'}));
    const f = render();
    expect(f.componentInstance['selectedLessonId']()).toBeNull();
  });

  it('warns once about an unknown lesson and drops it from the URL', () => {
    query.next(convertToParamMap({tab: 'content', lesson: '999'}));
    const f = render();
    f.componentRef.setInput('course', {...(course as CourseDetailDto)});
    f.detectChanges();
    expect(toast.add).toHaveBeenCalledTimes(1);
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({severity: 'warn'}));
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: {lesson: null}, queryParamsHandling: 'merge', replaceUrl: true}));
  });

  it('does not warn when the selected lesson is deleted before the URL catches up', () => {
    query.next(convertToParamMap({tab: 'content', lesson: '5'}));
    const f = render();
    const c = course as CourseDetailDto;
    f.componentRef.setInput('course', {...c, sections: [{...c.sections![0], lessons: []}]});
    f.detectChanges();
    expect(f.componentInstance['selectedLessonId']()).toBeNull();
    expect(toast.add).not.toHaveBeenCalled();
  });

  it('selecting a lesson writes ?lesson= without reloading', () => {
    const f = render();
    f.componentInstance['onSelect'](5);
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: {lesson: 5}, queryParamsHandling: 'merge'}));
  });

  it('selecting 0 clears ?lesson=', () => {
    const f = render();
    f.componentInstance['onSelect'](0);
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({queryParams: {lesson: null}}));
  });

  it('a renamed lesson patches its course-language title and emits the course', () => {
    const f = render();
    let emitted: CourseDetailDto | null = null;
    f.componentInstance.courseChange.subscribe((c) => (emitted = c));
    f.componentInstance['onTitleChanged']({id: 5, title: 'Nouveau'});
    const lesson = emitted!.sections![0].lessons![0];
    expect(lesson.translations['fr']['title']).toBe('Nouveau');
    expect((course as CourseDetailDto).sections![0].lessons![0].translations['fr']['title']).toBe('L');
  });

  describe('unsaved work', () => {
    afterEach(() => vi.restoreAllMocks());

    it('never prompts itself when switching lessons: the route guard is the only prompt', () => {
      const f = render();
      vi.spyOn(f.componentInstance, 'hasUnsavedChanges').mockReturnValue(true);
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      f.componentInstance['onSelect'](6);
      expect(confirm).not.toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledTimes(1);
      const extras = router.navigate.mock.calls[0][1];
      expect(extras.queryParams).toEqual({lesson: 6});
      expect(extras.state).toBeUndefined();
    });

    it('clearing the selection after a confirmed lesson deletion skips the guard', () => {
      const f = render();
      vi.spyOn(f.componentInstance, 'hasUnsavedChanges').mockReturnValue(true);
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      f.componentInstance['onSelect'](0);
      expect(confirm).not.toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({
        queryParams: {lesson: null}, state: {[SKIP_UNSAVED_GUARD]: true}}));
    });
  });
});
