import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {of} from 'rxjs';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {COURSE_LIST, COURSE_NEW} from '../../../app.routes-paths';
import {AuthService} from '../../../services/auth/auth';
import {DomainService} from '../../../services/domain/domain';
import {QuizAlertService} from '../../../services/quiz-alert/quiz-alert';
import {UnreadBadgesService} from '../../../services/unread-badges/unread-badges.service';
import {UserService} from '../../../services/user/user';
import {TopMenuComponent} from './topmenu';

describe('TopMenuComponent', () => {
  it('exports the component', () => {
    expect(TopMenuComponent).toBeTruthy();
  });

  describe('Courses dropdown instructor entries', () => {
    const me = signal<Record<string, unknown> | null>(null);
    const domains = vi.fn();

    beforeEach(() => {
      domains.mockReset();
      TestBed.configureTestingModule({
        imports: [TopMenuComponent],
        providers: [
          provideRouter([]),
          {provide: UserService, useValue: {
            currentUser: me, currentLang: 'en', lang: () => 'en', isSuperuser: () => !!me()?.['is_superuser'],
            getMe: () => of(me()), setLang: vi.fn(), updateMeLanguage: () => of(null),
            setCurrentDomain: () => of(null),
          }},
          {provide: AuthService, useValue: {authenticated: true}},
          {provide: DomainService, useValue: {list: domains}},
          {provide: QuizAlertService, useValue: {unreadCount: () => 0}},
          {provide: UnreadBadgesService, useValue: {startPolling: vi.fn(), stopPolling: vi.fn()}},
        ],
      });
      // Only the menu model is under test: skip the template and its children.
      TestBed.overrideComponent(TopMenuComponent, {set: {imports: [], template: ''}});
    });

    function render(user: Record<string, unknown>, visible: unknown[]) {
      me.set(user);
      domains.mockReturnValue(of(visible));
      const f = TestBed.createComponent(TopMenuComponent);
      f.detectChanges();
      return f.componentInstance;
    }

    const links = (c: TopMenuComponent) => c.coursesMenuItems.map((i) => i.link[0]);

    it('gives visitors a Home entry first, and hides it once signed in', () => {
      me.set(null);
      domains.mockReturnValue(of([]));
      const f = TestBed.createComponent(TopMenuComponent);
      f.componentRef.setInput('mode', 'public');
      f.detectChanges();
      const visitor = f.componentInstance.navItems;
      expect(visitor[0].link).toEqual(['/home']);
      expect(visitor[0].label).toBe('Home');

      const member = render({id: 1, is_superuser: false}, []);
      expect(member.navItems.map((i) => i.link[0])).not.toContain('/home');
    });

    it('shows "My courses" and "Create a course" to a domain manager', () => {
      const c = render({id: 1, is_superuser: false, current_domain: 7}, [
        {id: 7, owner: {id: 2}, managers: [{id: 1}]},
      ]);
      expect(links(c)).toContain(COURSE_LIST);
      expect(links(c)).toContain(COURSE_NEW);
      const labels = c.coursesMenuItems.map((i) => i.label);
      expect(labels).toContain('My courses');
      expect(labels).toContain('Create a course');
    });

    it('shows them to a domain owner', () => {
      expect(links(render({id: 1, is_superuser: false}, [{id: 7, owner: {id: 1}, managers: []}]))).toContain(COURSE_NEW);
    });

    it('shows them to a superuser even without any domain', () => {
      expect(links(render({id: 1, is_superuser: true}, []))).toContain(COURSE_LIST);
    });

    it('hides them from a plain member', () => {
      const c = render({id: 1, is_superuser: false, current_domain: 7}, [
        {id: 7, owner: {id: 2}, managers: [{id: 3}]},
      ]);
      expect(links(c)).not.toContain(COURSE_LIST);
      expect(links(c)).not.toContain(COURSE_NEW);
      expect(c.coursesMenuItems).toHaveLength(3);
    });
  });
});
