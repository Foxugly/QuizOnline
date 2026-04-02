// src/app/guards/auth.guard.ts
import {CanActivateFn, Router, UrlTree} from '@angular/router';
import {inject} from '@angular/core';
import {AuthService} from '../services/auth/auth';
import {UserService} from '../services/user/user';

export const authGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const userService = inject(UserService);

  if (auth.isLoggedIn()) {
    if (state.url !== '/change-password' && userService.requiresPasswordChange()) {
      return router.createUrlTree(['/change-password'], {
        queryParams: {next: state.url},
      });
    }
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: {next: state.url},
  });
};
