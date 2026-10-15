import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {of, throwError} from 'rxjs';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {CatalogService} from '../../services/catalog/catalog.service';
import {DomainService} from '../../services/domain/domain';
import {EnrollmentService} from '../../services/enrollment/enrollment.service';
import {UserService} from '../../services/user/user';
import {DashboardPage} from './dashboard';

const draft = (id: number, title: string, published = false) => ({
  id, slug: `c${id}`, domain: 7, is_published: published, translations: {en: {title}},
});

describe('DashboardPage', () => {
  const me = signal<Record<string, unknown> | null>(null);
  const catalog = {list: vi.fn()};
  const domains = vi.fn();

  beforeEach(() => {
    catalog.list.mockReset();
    domains.mockReset();
    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        {provide: UserService, useValue: {currentUser: me, lang: () => 'en', currentLang: 'en'}},
        {provide: EnrollmentService, useValue: {
          myProgress: () => of([]), myCertificates: () => of([]), myInvitations: () => of([]),
        }},
        {provide: DomainService, useValue: {list: domains}},
        {provide: CatalogService, useValue: catalog},
      ],
    });
  });

  function render(user: Record<string, unknown>, visibleDomains: unknown[], courses: unknown[] = []) {
    me.set(user);
    domains.mockReturnValue(of(visibleDomains));
    catalog.list.mockReturnValue(of({count: courses.length, next: null, previous: null, results: courses}));
    const f = TestBed.createComponent(DashboardPage);
    f.detectChanges();
    return f;
  }

  const manager = {id: 1, is_superuser: false};
  const managedDomain = [{id: 7, owner: {id: 2}, managers: [{id: 1}]}];
  const tile = (f: ReturnType<typeof render>) =>
    f.nativeElement.querySelector('[data-testid="instructor-drafts-tile"]') as HTMLElement | null;

  it('lists up to 5 unpublished manageable courses linking to their content tab', () => {
    const courses = [
      draft(1, 'One'), draft(2, 'Published', true), draft(3, 'Three'), draft(4, 'Four'),
      draft(5, 'Five'), draft(6, 'Six'), draft(8, 'Eight'),
    ];
    const f = render(manager, managedDomain, courses);
    expect(catalog.list).toHaveBeenCalledWith({manageableOnly: true});
    const rows = Array.from(tile(f)!.querySelectorAll('[data-testid="draft-course"]')) as HTMLAnchorElement[];
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.textContent)).not.toContain(expect.stringContaining('Published'));
    expect(rows[0].textContent).toContain('One');
    expect(rows[0].getAttribute('href')).toBe('/course/1/edit?tab=content');
    expect(rows[0].querySelector('app-status-badge')).not.toBeNull();
  });

  it('shows an empty state and the create button when there is no draft', () => {
    const f = render(manager, managedDomain, [draft(2, 'Published', true)]);
    expect(tile(f)!.querySelector('app-empty-state')).not.toBeNull();
    const create = tile(f)!.querySelector('[data-testid="create-course"]') as HTMLElement;
    expect(create.querySelector('a, button')?.getAttribute('href') ?? create.getAttribute('href')).toBe('/course/new');
  });

  it('is hidden from a plain member and does not query the courses', () => {
    const f = render(manager, [{id: 7, owner: {id: 2}, managers: [{id: 3}]}]);
    expect(tile(f)).toBeNull();
    expect(catalog.list).not.toHaveBeenCalled();
  });

  it('is shown to a superuser', () => {
    const f = render({id: 1, is_superuser: true}, [], [draft(1, 'One')]);
    expect(tile(f)).not.toBeNull();
  });

  it('still loads the drafts for a superuser when the domains request fails', () => {
    me.set({id: 1, is_superuser: true});
    domains.mockReturnValue(throwError(() => new Error('boom')));
    catalog.list.mockReturnValue(of({count: 1, next: null, previous: null, results: [draft(1, 'One')]}));
    const f = TestBed.createComponent(DashboardPage);
    f.detectChanges();
    expect(catalog.list).toHaveBeenCalledWith({manageableOnly: true});
    expect(tile(f)?.textContent).toContain('One');
  });

  it('stops the drafts skeleton for a non-instructor when the domains request fails', () => {
    me.set({id: 1, is_superuser: false});
    domains.mockReturnValue(throwError(() => new Error('boom')));
    const f = TestBed.createComponent(DashboardPage);
    f.detectChanges();
    expect(catalog.list).not.toHaveBeenCalled();
    expect((f.componentInstance as unknown as {draftsLoading: () => boolean}).draftsLoading()).toBe(false);
  });
});
