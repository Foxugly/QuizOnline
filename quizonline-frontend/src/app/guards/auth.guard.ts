// src/app/guards/auth.guard.ts
import {CanActivateFn, Router, UrlTree} from '@angular/router';
import {inject} from '@angular/core';
import {catchError, map, Observable, of} from 'rxjs';
import {AuthService} from '../services/auth/auth';
import {UserService} from '../services/user/user';
import {requiredSessionRedirect} from '../shared/auth/session-access-policy';
import {CustomUserReadDto} from '../api/generated/model/custom-user-read';

export const authGuard: CanActivateFn = (
  route,
  state,
): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const userService = inject(UserService);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login'], {
      queryParams: {next: state.url},
    });
  }

  const evaluate = (user: CustomUserReadDto | null | undefined): boolean | UrlTree => {
    const redirect = requiredSessionRedirect(user, state.url, {
      authenticated: auth.authenticated,
      requiresEmailConfirmation: (candidate) => userService.shouldConfirmEmail(candidate),
      requiresPasswordChange: (candidate) => userService.shouldForcePasswordChange(candidate),
    });
    if (redirect?.kind === 'login') {
      auth.logout();
      return router.createUrlTree(['/login'], {
        queryParams: redirect.queryParams,
      });
    }
    if (redirect?.kind === 'change-password') {
      return router.createUrlTree(['/change-password'], {
        queryParams: redirect.queryParams,
      });
    }
    return true;
  };

  // On a hard reload the access token is gone (memory-only) and currentUser()
  // is null even though isLoggedIn() is true (stored refresh token). Fetch /me
  // before deciding so the password-change / email-confirmation gates are not
  // bypassed. switchMap-equivalent: a single getMe() call, mapped to the result.
  if (userService.currentUser()) {
    return evaluate(userService.currentUser());
  }

  return userService.getMe().pipe(
    map((user) => evaluate(user)),
    catchError(() =>
      of(
        router.createUrlTree(['/login'], {
          queryParams: {next: state.url},
        }),
      ),
    ),
  );
};
