import {ChangeDetectionStrategy, Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Route, Router, Routes} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {provideRouter} from '@angular/router';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {routes as appRoutes} from '../../app.routes';
import {UserService} from '../../services/user/user';
import {SKIP_UNSAVED_GUARD, unsavedChangesGuard} from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lets through when nothing is unsaved', () => {
    const confirm = vi.spyOn(window, 'confirm');
    expect(unsavedChangesGuard({hasUnsavedChanges: () => false}, {} as never, {} as never, {} as never)).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks when something is unsaved and blocks on refusal', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(unsavedChangesGuard({hasUnsavedChanges: () => true}, {} as never, {} as never, {} as never)).toBe(false);
    expect(confirm).toHaveBeenCalled();
  });

  it('lets through when the author confirms', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    expect(unsavedChangesGuard({hasUnsavedChanges: () => true}, {} as never, {} as never, {} as never)).toBe(true);
  });
});

/** Stand-in for CourseEdit: only the guard contract matters here. */
@Component({selector: 'app-dirty-page', template: '', changeDetection: ChangeDetectionStrategy.OnPush})
class DirtyPage {
  static dirty = true;
  hasUnsavedChanges(): boolean {
    return DirtyPage.dirty;
  }
}

function findRoute(list: Routes, path: string): Route | undefined {
  for (const r of list) {
    if (r.path === path) {
      return r;
    }
    const nested = r.children ? findRoute(r.children, path) : undefined;
    if (nested) {
      return nested;
    }
  }
  return undefined;
}

describe('course editor route: guard on query-param changes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    DirtyPage.dirty = true;
  });

  const real = findRoute(appRoutes, 'course/:id/edit');

  async function setup() {
    TestBed.configureTestingModule({
      providers: [provideRouter([{
        path: 'course/:id/edit',
        component: DirtyPage,
        canDeactivate: real?.canDeactivate,
        runGuardsAndResolvers: real?.runGuardsAndResolvers,
      }])],
    });
    const harness = await RouterTestingHarness.create();
    DirtyPage.dirty = false;
    await harness.navigateByUrl('/course/1/edit?tab=content&lesson=5');
    DirtyPage.dirty = true;
    return TestBed.inject(Router);
  }

  it('re-runs the guard on query-param-only changes (browser back / forward)', () => {
    expect(real?.canDeactivate).toContain(unsavedChangesGuard);
    expect(real?.runGuardsAndResolvers).toBe('paramsOrQueryParamsChange');
  });

  it('prompts and keeps the URL when a ?lesson= change is refused with unsaved work', async () => {
    const router = await setup();
    TestBed.inject(UserService)['_lang'].set('fr' as never);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const ok = await router.navigateByUrl('/course/1/edit?tab=content&lesson=6');
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith('Les modifications non enregistrées seront perdues. Continuer ?');
    expect(ok).toBe(false);
    expect(router.url).toBe('/course/1/edit?tab=content&lesson=5');
  });

  it('skips the prompt for navigations flagged with SKIP_UNSAVED_GUARD', async () => {
    const router = await setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const ok = await router.navigateByUrl('/course/1/edit?tab=content', {state: {[SKIP_UNSAVED_GUARD]: true}});
    expect(confirm).not.toHaveBeenCalled();
    expect(ok).toBe(true);
  });
});
