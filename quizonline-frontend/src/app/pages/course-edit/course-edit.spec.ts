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
    router.navigate.mockReset(); // p-tabs echoes its initial value on init
    return f.componentInstance;
  }

  it('refusing the confirm keeps the URL and restores the tab strip value', () => {
    const c = render();
    vi.spyOn(c, 'hasUnsavedChanges').mockReturnValue(true);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    tabs.updateValue('analytics'); // what a click does: model write, then valueChange -> onTabChange
    expect(confirm).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(tabs.value()).toBe('content');
  });

  it('confirming navigates to the requested tab', () => {
    const c = render();
    vi.spyOn(c, 'hasUnsavedChanges').mockReturnValue(true);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    c['onTabChange']('analytics');
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: {tab: 'analytics', lesson: null}}));
  });

  it('does not ask when nothing is unsaved', () => {
    const c = render();
    const confirm = vi.spyOn(window, 'confirm');
    c['onTabChange']('analytics');
    expect(confirm).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });
});
