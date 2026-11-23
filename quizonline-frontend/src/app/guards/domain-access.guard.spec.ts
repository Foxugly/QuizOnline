import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  convertToParamMap,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlSegment,
  UrlTree,
} from '@angular/router';
import {firstValueFrom, isObservable, Observable, of, throwError} from 'rxjs';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {AuthService} from '../services/auth/auth';
import {DomainService} from '../services/domain/domain';
import {UserService} from '../services/user/user';
import {domainAccessGuard} from './domain-access.guard';

type Me = {
  id: number;
  is_superuser?: boolean;
  nb_domain_max?: number;
  owned_domain_ids?: number[] | null;
};

type Domain = {id: number; owner?: {id: number} | null; managers?: {id: number}[] | null};

describe('domainAccessGuard', () => {
  let loggedIn: boolean;
  let currentUser: ReturnType<typeof signal<Me | null>>;
  let domainList: ReturnType<typeof vi.fn>;
  let getMe: ReturnType<typeof vi.fn>;
  let router: Router;

  beforeEach(() => {
    loggedIn = true;
    currentUser = signal<Me | null>(null);
    domainList = vi.fn(() => of([] as Domain[]));
    getMe = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {provide: AuthService, useValue: {isLoggedIn: () => loggedIn}},
        {provide: DomainService, useValue: {list: domainList}},
        {provide: UserService, useValue: {currentUser, getMe}},
      ],
    });
    router = TestBed.inject(Router);
  });

  function route(path: string[], params: Record<string, string> = {}): ActivatedRouteSnapshot {
    return {
      paramMap: convertToParamMap(params),
      url: path.map((p) => new UrlSegment(p, {})),
    } as unknown as ActivatedRouteSnapshot;
  }

  async function run(r: ActivatedRouteSnapshot, url = '/target'): Promise<boolean | UrlTree> {
    const result = TestBed.runInInjectionContext(() =>
      domainAccessGuard(r, {url} as RouterStateSnapshot),
    );
    if (isObservable(result)) {
      return firstValueFrom(result as Observable<boolean | UrlTree>);
    }
    return result as boolean | UrlTree;
  }

  function asUrl(result: boolean | UrlTree): string {
    expect(result).toBeInstanceOf(UrlTree);
    return router.serializeUrl(result as UrlTree);
  }

  it('redirects anonymous users to /login with the target as next', async () => {
    loggedIn = false;
    const result = await run(route(['domain', 'add']), '/domain/add');
    expect(asUrl(result)).toBe('/login?next=%2Fdomain%2Fadd');
    expect(domainList).not.toHaveBeenCalled();
  });

  describe('coarse routes (no domain id)', () => {
    it('lets a cached superuser through without loading domains', async () => {
      currentUser.set({id: 1, is_superuser: true});
      expect(await run(route(['domain', 'add']))).toBe(true);
      expect(domainList).not.toHaveBeenCalled();
    });

    it('lets an owner of any domain through', async () => {
      currentUser.set({id: 1, owned_domain_ids: [4]});
      expect(await run(route(['domain', 'list']))).toBe(true);
    });

    it('lets a user with an unused creation slot through', async () => {
      currentUser.set({id: 1, nb_domain_max: 2, owned_domain_ids: []});
      expect(await run(route(['domain', 'add']))).toBe(true);
    });

    it('lets a pure manager through after checking the domain list', async () => {
      currentUser.set({id: 7, nb_domain_max: 0, owned_domain_ids: null});
      domainList.mockReturnValue(of([{id: 3, owner: {id: 1}, managers: [{id: 7}]}]));
      expect(await run(route(['subject', '5', 'edit'], {id: '5'}))).toBe(true);
      expect(domainList).toHaveBeenCalledTimes(1);
    });

    it('sends users who manage nothing and have no quota to the quiz list', async () => {
      currentUser.set({id: 7});
      domainList.mockReturnValue(of([{id: 3, owner: null, managers: null}]));
      expect(asUrl(await run(route(['domain', 'list'])))).toBe('/quiz/list');
    });

    it('falls back to the quiz list when the domain list fails', async () => {
      currentUser.set({id: 7});
      domainList.mockReturnValue(throwError(() => new Error('boom')));
      expect(asUrl(await run(route(['domain', 'list'])))).toBe('/quiz/list');
    });

    it('fetches the user when not cached and admits a creation-slot holder', async () => {
      getMe.mockReturnValue(of({id: 2, nb_domain_max: 1, owned_domain_ids: []}));
      expect(await run(route(['domain', 'add']))).toBe(true);
      expect(getMe).toHaveBeenCalledTimes(1);
    });

    it('fetches the user and then checks managed domains', async () => {
      getMe.mockImplementation(() => {
        const me = {id: 2, nb_domain_max: 0};
        currentUser.set(me);
        return of(me);
      });
      domainList.mockReturnValue(of([{id: 3, owner: {id: 2}}]));
      expect(await run(route(['domain', 'list']))).toBe(true);
    });

    it('redirects to login when the domain list resolves but the user signal is empty', async () => {
      getMe.mockReturnValue(of({id: 2}));
      domainList.mockReturnValue(of([]));
      expect(asUrl(await run(route(['domain', 'list']), '/domain/list'))).toBe(
        '/login?next=%2Fdomain%2Flist',
      );
    });

    it('redirects to login when fetching the user fails', async () => {
      getMe.mockReturnValue(throwError(() => new Error('401')));
      expect(asUrl(await run(route(['domain', 'add']), '/domain/add'))).toBe(
        '/login?next=%2Fdomain%2Fadd',
      );
    });
  });

  describe('domain-scoped routes', () => {
    it('reads :id under the domain prefix and admits the owner of that domain', async () => {
      currentUser.set({id: 9, owned_domain_ids: [5]});
      domainList.mockReturnValue(of([{id: 5, owner: {id: 9}}]));
      expect(await run(route(['domain', '5', 'edit'], {id: '5'}))).toBe(true);
      expect(domainList).toHaveBeenCalledTimes(1);
    });

    it('refuses an owner of another domain (no short-circuit on ownership)', async () => {
      currentUser.set({id: 9, owned_domain_ids: [5], nb_domain_max: 10});
      domainList.mockReturnValue(of([{id: 5, owner: {id: 9}}, {id: 6, owner: {id: 1}}]));
      expect(asUrl(await run(route(['domain', '6', 'delete'], {id: '6'})))).toBe('/quiz/list');
    });

    it('admits a manager of the domain given by :domainId', async () => {
      currentUser.set({id: 9});
      domainList.mockReturnValue(of([{id: 8, owner: {id: 1}, managers: [{id: 9}]}]));
      expect(await run(route(['join-requests', '8'], {domainId: '8'}))).toBe(true);
    });

    it('refuses when the targeted domain is not in the visible list', async () => {
      currentUser.set({id: 9});
      domainList.mockReturnValue(of([]));
      expect(asUrl(await run(route(['join-requests', '8'], {domainId: '8'})))).toBe('/quiz/list');
    });

    it('treats a non-numeric :domainId as a coarse route', async () => {
      currentUser.set({id: 9, nb_domain_max: 1});
      expect(await run(route(['join-requests', 'abc'], {domainId: 'abc'}))).toBe(true);
      expect(domainList).not.toHaveBeenCalled();
    });

    it('treats a non-numeric :id under domain as a coarse route', async () => {
      currentUser.set({id: 9, owned_domain_ids: [1]});
      expect(await run(route(['domain', 'xyz'], {id: 'xyz'}))).toBe(true);
    });

    it('lets a cached superuser through without loading domains', async () => {
      currentUser.set({id: 1, is_superuser: true});
      expect(await run(route(['domain', '6', 'edit'], {id: '6'}))).toBe(true);
      expect(domainList).not.toHaveBeenCalled();
    });

    it('lets a fetched superuser through', async () => {
      getMe.mockReturnValue(of({id: 1, is_superuser: true}));
      expect(await run(route(['domain', '6', 'edit'], {id: '6'}))).toBe(true);
    });

    it('admits a superuser that only shows up once domains are loaded', async () => {
      getMe.mockImplementation(() => {
        currentUser.set({id: 1, is_superuser: true});
        return of({id: 1});
      });
      expect(await run(route(['domain', '6', 'edit'], {id: '6'}))).toBe(true);
    });

    it('redirects to login when the user signal is empty after loading domains', async () => {
      getMe.mockReturnValue(of({id: 1}));
      expect(asUrl(await run(route(['domain', '6', 'edit'], {id: '6'}), '/x'))).toBe(
        '/login?next=%2Fx',
      );
    });

    it('falls back to the quiz list when the domain list fails', async () => {
      currentUser.set({id: 9});
      domainList.mockReturnValue(throwError(() => new Error('403')));
      expect(asUrl(await run(route(['domain', '6', 'edit'], {id: '6'})))).toBe('/quiz/list');
    });
  });
});
