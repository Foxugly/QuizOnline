import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import {firstValueFrom, isObservable, Observable, of, throwError} from 'rxjs';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {AuthService} from '../services/auth/auth';
import {UserService} from '../services/user/user';
import {superuserGuard} from './superuser.guard';

describe('superuserGuard', () => {
  let loggedIn: boolean;
  let currentUser: ReturnType<typeof signal<{is_superuser?: boolean} | null>>;
  let getMe: ReturnType<typeof vi.fn>;
  let router: Router;

  beforeEach(() => {
    loggedIn = true;
    currentUser = signal<{is_superuser?: boolean} | null>(null);
    getMe = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {provide: AuthService, useValue: {isLoggedIn: () => loggedIn}},
        {provide: UserService, useValue: {currentUser, getMe}},
      ],
    });
    router = TestBed.inject(Router);
  });

  async function run(): Promise<string | boolean> {
    let result = TestBed.runInInjectionContext(() =>
      superuserGuard({} as ActivatedRouteSnapshot, {url: '/admin'} as RouterStateSnapshot),
    );
    if (isObservable(result)) {
      result = await firstValueFrom(result as Observable<boolean | UrlTree>);
    }
    return result instanceof UrlTree ? router.serializeUrl(result) : (result as boolean);
  }

  it('sends anonymous users to login', async () => {
    loggedIn = false;
    expect(await run()).toBe('/login?next=%2Fadmin');
  });

  it('admits a cached superuser and refuses a cached regular user', async () => {
    currentUser.set({is_superuser: true});
    expect(await run()).toBe(true);
    currentUser.set({is_superuser: false});
    expect(await run()).toBe('/quiz/list');
    expect(getMe).not.toHaveBeenCalled();
  });

  it('loads the user when not cached', async () => {
    getMe.mockImplementation(() => {
      currentUser.set({is_superuser: true});
      return of({});
    });
    expect(await run()).toBe(true);
  });

  it('sends the user to login when loading fails', async () => {
    getMe.mockReturnValue(throwError(() => new Error('401')));
    expect(await run()).toBe('/login?next=%2Fadmin');
  });
});
