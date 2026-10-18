import {HttpHeaders} from '@angular/common/http';

/**
 * Opt-in to the backend's HttpOnly refresh cookie (quizonline-server
 * ``customuser/refresh_cookie.py``, fleet design piloted on PushIT). Sent on
 * the auth calls ONLY: the server then sets the refresh token in an
 * ``HttpOnly; Secure; SameSite=Lax`` cookie scoped to ``/api/v1/token/`` and
 * leaves it out of the JSON body, so no script (and no XSS) can read it.
 * ``withCredentials`` lets the browser store / send that cookie when the API
 * is on another origin (dev ``localhost:4200`` -> ``:8000``); in prod the SPA
 * and the API share ``quizonline.foxugly.com`` and it is a no-op.
 */
export const AUTH_MODE_HEADER = 'X-Auth-Mode';
export const AUTH_MODE_COOKIE = 'cookie';

export function cookieAuthOptions(): {headers: HttpHeaders; withCredentials: true} {
  return {
    headers: new HttpHeaders({[AUTH_MODE_HEADER]: AUTH_MODE_COOKIE}),
    withCredentials: true,
  };
}
