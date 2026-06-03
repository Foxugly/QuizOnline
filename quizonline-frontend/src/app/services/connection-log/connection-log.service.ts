import {HttpClient, HttpParams} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {EMPTY, Observable} from 'rxjs';
import {catchError} from 'rxjs/operators';

import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';

export type LoginMethod = 'password' | 'magic_link';

/**
 * Thin wrapper around the ``connection-log`` REST endpoints. Routes through
 * ``HttpClient`` (matching the :class:`CatalogService` pattern) rather than
 * the generated client so the fire-and-forget ``record()`` call site stays
 * trivial and error-swallowing.
 */
@Injectable({providedIn: 'root'})
export class ConnectionLogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/connection-log`;

  /**
   * Fire-and-forget: record the current login with browser context.
   * Never throws / never blocks the login flow — all HTTP errors are
   * swallowed via ``catchError(() => EMPTY)``.
   */
  record(loginMethod: LoginMethod): void {
    const body = {
      login_method: loginMethod,
      local_time: new Date().toString(),
      browser_language: navigator.language ?? '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
      screen_width: window.screen?.width ?? null,
      screen_height: window.screen?.height ?? null,
      online: navigator.onLine ?? null,
    };
    this.http.post(`${this.baseUrl}/`, body).pipe(catchError(() => EMPTY)).subscribe();
  }

  list(start?: string, end?: string): Observable<unknown> {
    let params = new HttpParams();
    if (start) {
      params = params.set('start', start);
    }
    if (end) {
      params = params.set('end', end);
    }
    return this.http.get<unknown>(`${this.baseUrl}/`, {params});
  }
}
