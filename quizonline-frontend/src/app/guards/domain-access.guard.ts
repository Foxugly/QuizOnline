import {inject} from '@angular/core';
import {CanActivateFn, Router, UrlTree} from '@angular/router';
import {catchError, map, of, switchMap} from 'rxjs';
import {AuthService} from '../services/auth/auth';
import {DomainService} from '../services/domain/domain';
import {UserService} from '../services/user/user';

function redirectToLogin(router: Router, url: string): UrlTree {
  return router.createUrlTree(['/login'], {
    queryParams: {next: url},
  });
}

export const domainAccessGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const domainService = inject(DomainService);
  const router = inject(Router);
  const userService = inject(UserService);

  if (!auth.isLoggedIn()) {
    return redirectToLogin(router, state.url);
  }

  /** True when the caller has at least one unused creation slot on
   *  their ``nb_domain_max`` quota. Mirrors the same check the topmenu
   *  uses so the guard never blocks a route the menu advertises. */
  const hasCreationSlot = (user: {
    is_superuser?: boolean;
    nb_domain_max?: number;
    owned_domain_ids?: number[] | null;
  }) => {
    if (user.is_superuser) {
      return true;
    }
    const quota = user.nb_domain_max ?? 0;
    const owned = user.owned_domain_ids?.length ?? 0;
    return quota > owned;
  };

  const canAccessManagedDomainPages = () => domainService.list().pipe(
    map((domains) => {
      const me = userService.currentUser();
      if (!me) {
        return redirectToLogin(router, state.url);
      }

      if (me.is_superuser) {
        return true;
      }

      const managesOne = domains.some(
        (domain) => domain.owner?.id === me.id || (domain.managers ?? []).some((user) => user.id === me.id),
      );
      if (managesOne || hasCreationSlot(me)) {
        return true;
      }
      return router.createUrlTree(['/quiz/list']);
    }),
    catchError(() => of(router.createUrlTree(['/quiz/list']))),
  );

  const currentUser = userService.currentUser();
  if (currentUser) {
    if (currentUser.is_superuser || (currentUser.owned_domain_ids?.length ?? 0) > 0 || hasCreationSlot(currentUser)) {
      return true;
    }
    return canAccessManagedDomainPages();
  }

  return userService.getMe().pipe(
    switchMap((user) => (
      user.is_superuser || (user.owned_domain_ids?.length ?? 0) > 0 || hasCreationSlot(user)
        ? of(true)
        : canAccessManagedDomainPages()
    )),
    catchError(() => of(redirectToLogin(router, state.url))),
  );
};
