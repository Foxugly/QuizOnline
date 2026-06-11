import {inject} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree} from '@angular/router';
import {catchError, map, of, switchMap} from 'rxjs';
import {AuthService} from '../services/auth/auth';
import {DomainService} from '../services/domain/domain';
import {UserService} from '../services/user/user';

function redirectToLogin(router: Router, url: string): UrlTree {
  return router.createUrlTree(['/login'], {
    queryParams: {next: url},
  });
}

/** Reads the domain id this route targets, if any. ``join-requests`` uses
 *  ``:domainId``; ``domain/:id/edit`` and ``domain/:id/delete`` use ``:id``
 *  under the ``domain`` path prefix. Routes without a domain-scoped param
 *  (e.g. ``domain/add``, ``subject/:id/edit``) return null and fall back to
 *  the coarse "manages at least one domain" check. */
function targetDomainId(route: ActivatedRouteSnapshot): number | null {
  const explicit = route.paramMap.get('domainId');
  if (explicit) {
    const parsed = Number(explicit);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const isDomainPath = route.url.length > 0 && route.url[0].path === 'domain';
  const id = route.paramMap.get('id');
  if (isDomainPath && id) {
    const parsed = Number(id);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export const domainAccessGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const domainService = inject(DomainService);
  const router = inject(Router);
  const userService = inject(UserService);

  if (!auth.isLoggedIn()) {
    return redirectToLogin(router, state.url);
  }

  const domainId = targetDomainId(route);

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

  /** Param-aware authorization: the route targets one specific domain, so
   *  confirm the caller owns or manages THAT domain (or is superuser). A
   *  failed/forbidden load redirects instead of silently passing. */
  const canAccessSpecificDomain = (id: number) =>
    domainService.list().pipe(
      map((domains) => {
        const me = userService.currentUser();
        if (!me) {
          return redirectToLogin(router, state.url);
        }
        if (me.is_superuser) {
          return true;
        }
        const domain = domains.find((d) => d.id === id);
        const managesThis =
          !!domain &&
          (domain.owner?.id === me.id ||
            (domain.managers ?? []).some((user) => user.id === me.id));
        return managesThis ? true : router.createUrlTree(['/quiz/list']);
      }),
      catchError(() => of(router.createUrlTree(['/quiz/list']))),
    );

  const canAccessManagedDomainPages = () =>
    domainService.list().pipe(
      map((domains) => {
        const me = userService.currentUser();
        if (!me) {
          return redirectToLogin(router, state.url);
        }

        if (me.is_superuser) {
          return true;
        }

        const managesOne = domains.some(
          (domain) =>
            domain.owner?.id === me.id ||
            (domain.managers ?? []).some((user) => user.id === me.id),
        );
        if (managesOne || hasCreationSlot(me)) {
          return true;
        }
        return router.createUrlTree(['/quiz/list']);
      }),
      catchError(() => of(router.createUrlTree(['/quiz/list']))),
    );

  const authorize = () =>
    domainId !== null ? canAccessSpecificDomain(domainId) : canAccessManagedDomainPages();

  const currentUser = userService.currentUser();
  if (currentUser) {
    // Superusers and creation-slot holders short-circuit only the coarse
    // (non-domain-specific) routes; domain-scoped routes always verify the
    // exact domain so an owner of A cannot open /domain/B/delete.
    if (
      domainId === null &&
      (currentUser.is_superuser ||
        (currentUser.owned_domain_ids?.length ?? 0) > 0 ||
        hasCreationSlot(currentUser))
    ) {
      return true;
    }
    if (domainId !== null && currentUser.is_superuser) {
      return true;
    }
    return authorize();
  }

  return userService.getMe().pipe(
    switchMap((user) => {
      if (domainId === null && (user.is_superuser || (user.owned_domain_ids?.length ?? 0) > 0 || hasCreationSlot(user))) {
        return of(true as boolean | UrlTree);
      }
      if (domainId !== null && user.is_superuser) {
        return of(true as boolean | UrlTree);
      }
      return authorize();
    }),
    catchError(() => of(redirectToLogin(router, state.url))),
  );
};
