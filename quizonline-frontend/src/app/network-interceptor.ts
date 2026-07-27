import {HttpErrorResponse, HttpInterceptorFn} from '@angular/common/http';
import {inject} from '@angular/core';
import {catchError, retry, throwError, timeout, timer} from 'rxjs';
import {environment} from '../environments/environment';
import {BackendStatusService} from './services/status/status';

// Délai max avant de considérer le backend "pas de réponse". 30 s couvre
// les endpoints lourds (analytics, exports, premier hit sans cache chaud)
// sans laisser un onglet zombie indéfiniment si le serveur est vraiment
// down.
const REQ_TIMEOUT_MS = 30_000;

export const NetworkInterceptor: HttpInterceptorFn = (req, next) => {
  const status = inject(BackendStatusService);

  return next(req).pipe(
    timeout(REQ_TIMEOUT_MS),
    // Retry idempotent GETs on transient failures (connection dropped = status
    // 0, or a 5xx) with a short backoff, so a blip doesn't surface as an error.
    // Non-GET or non-transient errors are re-thrown immediately (retry stops).
    retry({
      count: 2,
      delay: (error, retryCount) => {
        const transient =
          error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500);
        if (req.method !== 'GET' || !transient) {
          return throwError(() => error);
        }
        return timer(retryCount * 500); // 500 ms, then 1000 ms
      },
    }),
    catchError((err: unknown) => {
      // Timeout RxJS "simule" un status 0 pour nous
      if (err instanceof HttpErrorResponse) {
        if (err.status === 0) {
          // Échec de connexion : serveur down, CORS, DNS, etc.
          status.setDown(`API inaccessible. Vérifie que l'API tourne sur ${environment.apiBaseUrl}`);
        } else {
          // HTTP valide (ex : 400/401/500), le backend répond
          status.setUp();
        }
      } else {
        // Erreur non-HTTP (timeout opérateur, etc.)
        status.setDown('API : délai dépassé.');
      }
      return throwError(() => err);
    })
  );
};
