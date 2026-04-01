import {HttpErrorResponse, HttpInterceptorFn} from '@angular/common/http';
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

  const accessToken = auth.getAccessToken();
  let authReq = req;

  const apiRequest = isApiUrl(req.url);

  if (accessToken && apiRequest) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
        'Accept-Language': userService.currentLang,
      },
    });
  } else if (apiRequest) {
    authReq = req.clone({
      setHeaders: {
        'Accept-Language': userService.currentLang,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || !apiRequest) {
        return throwError(() => error);
      }

      if (isAuthEndpoint(authReq.url)) {
        return throwError(() => error);
      }

      const refresh$ = auth.refreshTokens();
      if (!refresh$) {
        auth.logout();
        return throwError(() => error);
      }

      return refresh$.pipe(
        switchMap(() => {
          const newAccessToken = auth.getAccessToken();

          const retryReq = newAccessToken
            ? authReq.clone({
              setHeaders: {
                Authorization: `Bearer ${newAccessToken}`,
              },
            })
            : authReq;

          return next(retryReq);
        }),
        catchError((refreshError: HttpErrorResponse) => {
          auth.logout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
