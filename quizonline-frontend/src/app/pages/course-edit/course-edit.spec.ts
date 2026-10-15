import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {ActivatedRoute, convertToParamMap, Router} from '@angular/router';
import {BehaviorSubject, of} from 'rxjs';
import {ConfirmationService} from 'primeng/api';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {CatalogService} from '../../services/catalog/catalog.service';
import {AppToastService} from '../../shared/toast/app-toast.service';
import {TabsModule} from 'primeng/tabs';
import {Tabs} from 'primeng/tabs';
import {CourseEdit} from './course-edit';

describe('CourseEdit unsaved tab guard', () => {
  let tabs: Tabs;
  const router = {navigate: vi.fn()};

  beforeEach(() => {
    router.navigate.mockReset();
    router.navigate.mockResolvedValue(true);
    TestBed.configureTestingModule({
      imports: [CourseEdit],
      providers: [
        {provide: ActivatedRoute, useValue: {
          paramMap: of(convertToParamMap({id: '0'})),
          queryParamMap: new BehaviorSubject(convertToParamMap({tab: 'content'})),
        }},
        {provide: Router, useValue: router},
        {provide: CatalogService, useValue: {detailById: vi.fn()}},
        {provide: AppToastService, useValue: {add: vi.fn(), addApiError: vi.fn()}},
        {provide: ConfirmationService, useValue: {}},
      ],
    });
    TestBed.overrideComponent(CourseEdit, {set: {imports: [TabsModule], template: `
      <p-tabs [value]="activeTab()" (valueChange)="onTabChange($event)">
        <p-tablist><p-tab value="content">c</p-tab><p-tab value="analytics">a</p-tab></p-tablist>
      </p-tabs>`}});
  });

  afterEach(() => vi.restoreAllMocks());

  function render() {
    const f = TestBed.createComponent(CourseEdit);
    f.detectChanges();
    tabs = f.debugElement.query(By.directive(Tabs)).componentInstance as Tabs;
    router.navigate.mockClear(); // p-tabs echoes its initial value on init
    return f.componentInstance;
  }

  it('a tab switch refused by the guard restores the tab strip value', async () => {
    const c = render();
    vi.spyOn(c, 'hasUnsavedChanges').mockReturnValue(true);
    router.navigate.mockResolvedValue(false); // unsavedChangesGuard refused
    tabs.updateValue('analytics'); // what a click does: model write, then valueChange -> onTabChange
    await Promise.resolve();
    await Promise.resolve();
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(tabs.value()).toBe('content');
  });

  it('does not prompt itself on a tab click: the route guard is the only prompt', async () => {
    const c = render();
    vi.spyOn(c, 'hasUnsavedChanges').mockReturnValue(true);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    router.navigate.mockResolvedValue(true);
    c['onTabChange']('analytics');
    await Promise.resolve();
    expect(confirm).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: {tab: 'analytics', lesson: null}}));
  });

  it('asks the browser to confirm a reload / close only with unsaved work', () => {
    const c = render();
    const dirty = vi.spyOn(c, 'hasUnsavedChanges').mockReturnValue(false);
    const clean = new Event('beforeunload', {cancelable: true});
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);

    dirty.mockReturnValue(true);
    const unsaved = new Event('beforeunload', {cancelable: true});
    window.dispatchEvent(unsaved);
    expect(unsaved.defaultPrevented).toBe(true);
  });
});
