// src/app/guards/auth.guard.ts
import {CanActivateFn, Router, UrlTree} from '@angular/router';
import {inject} from '@angular/core';
import {AuthService} from '../services/auth/auth';
import {UserService} from '../services/user/user';
import {requiredSessionRedirect} from '../shared/auth/session-access-policy';

export const authGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const userService = inject(UserService);

  if (auth.isLoggedIn()) {
    const redirect = requiredSessionRedirect(userService.currentUser(), state.url, {
      authenticated: auth.authenticated,
      requiresEmailConfirmation: (user) => userService.shouldConfirmEmail(user),
      requiresPasswordChange: (user) => userService.shouldForcePasswordChange(user),
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
  }

  return router.createUrlTree(['/login'], {
    queryParams: {next: state.url},
  });
};
