import {inject} from '@angular/core';
import {CanActivateFn, Router, UrlTree} from '@angular/router';
import {catchError, map, of} from 'rxjs';
import {AuthService} from '../services/auth/auth';
import {UserService} from '../services/user/user';

function redirectToLogin(router: Router, url: string): UrlTree {
  return router.createUrlTree(['/login'], {
    queryParams: {next: url},
  });
}

export const staffGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const userService = inject(UserService);

  if (!auth.isLoggedIn()) {
    return redirectToLogin(router, state.url);
  }

  const currentUser = userService.currentUser();
  if (currentUser) {
    return currentUser.is_staff || currentUser.is_superuser
      ? true
      : router.createUrlTree(['/quiz/list']);
  }

  return userService.getMe().pipe(
    map((user) => (user.is_staff || user.is_superuser ? true : router.createUrlTree(['/quiz/list']))),
    catchError(() => of(redirectToLogin(router, state.url))),
  );
};
