import {HttpErrorResponse, HttpInterceptorFn, HttpRequest} from '@angular/common/http';
import {inject} from '@angular/core';
import {catchError, switchMap, throwError} from 'rxjs';

import {AuthService} from './services/auth/auth';
import {UserService} from './services/user/user';
import {isApiUrl} from './shared/api/runtime-api-base-url';

function isAuthEndpoint(url: string): boolean {
  return (
    url.includes('/api/token') ||
    url.includes('/api/user/password/reset')
  );
}

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const userService = inject(UserService);

  const apiRequest = isApiUrl(req.url);

  // ``buildAuthedRequest`` clones the outgoing request and stamps the
  // current access token (if any) plus the ``Accept-Language`` header.
  // Pulled into a helper because we may need to rebuild the request
  // twice when a proactive refresh fires before the first send.
  const buildAuthedRequest = (originalReq: HttpRequest<unknown>): HttpRequest<unknown> => {
    if (!apiRequest) {
      return originalReq;
    }
    const accessToken = auth.getAccessToken();
    const setHeaders: Record<string, string> = {
      'Accept-Language': userService.currentLang,
    };
    if (accessToken) {
      setHeaders['Authorization'] = `Bearer ${accessToken}`;
    }
    return originalReq.clone({setHeaders});
  };

  // Proactive cold-start refresh. On a full page reload the access
  // token is intentionally lost (kept in memory only for XSS-safety)
  // while the refresh token lives in localStorage. Without this
  // shortcut every initial API call would go out un-authenticated,
  // get a 401 back, trigger the reactive refresh below, and only
  // then return real data — doubling the round-trips per cold load.
  //
  // When we *know* we have a refresh token but no access token (and
  // the request is not the refresh endpoint itself), drive the
  // refresh first and queue the request behind it. The
  // ``auth.refreshTokens()`` observable is itself ``shareReplay``'d,
  // so several requests racing this branch share a single refresh.
  if (apiRequest && !isAuthEndpoint(req.url) && !auth.getAccessToken() && auth.getRefreshToken()) {
    const refresh$ = auth.refreshTokens();
    if (refresh$) {
      return refresh$.pipe(
        switchMap(() => next(buildAuthedRequest(req))),
        catchError((refreshError: HttpErrorResponse) => {
          auth.logout();
          return throwError(() => refreshError);
        }),
      );
    }
  }

  const authReq = buildAuthedRequest(req);

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || !apiRequest) {
        return throwError(() => error);
      }

      if (isAuthEndpoint(authReq.url)) {
        return throwError(() => error);
      }

      // Reactive refresh path — kept for when the access token was
      // valid at request time but expired server-side mid-session.
      // Proactive refresh above handles the cold-start case.
      const refresh$ = auth.refreshTokens();
      if (!refresh$) {
        auth.logout();
        return throwError(() => error);
      }

      return refresh$.pipe(
        switchMap(() => next(buildAuthedRequest(req))),
        catchError((refreshError: HttpErrorResponse) => {
          auth.logout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
