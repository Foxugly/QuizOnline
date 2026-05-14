import * as Sentry from '@sentry/angular';

import {environment} from '../../../environments/environment';

type RuntimeSentryWindow = typeof globalThis & {
  __QUIZONLINE_SENTRY_DSN?: string;
  __QUIZONLINE_SENTRY_ENV?: string;
  __QUIZONLINE_SENTRY_RELEASE?: string;
};

/**
 * Opt-in Sentry initialiser.
 *
 * Resolution order for the DSN:
 *   1. ``window.__QUIZONLINE_SENTRY_DSN`` — runtime-injected via the
 *      deployment template (same pattern as ``__QUIZONLINE_API_BASE_URL``).
 *      Lets you rotate the DSN without rebuilding the Angular bundle.
 *   2. ``environment.sentryDsn`` — build-time. Empty by default in both
 *      environment.ts and environment.prod.ts so dev builds never report.
 *
 * If neither is set, this function is a no-op — the SDK is not initialised,
 * so an unconfigured Sentry org is harmless.
 */
export function initSentry(): void {
  const w = globalThis as RuntimeSentryWindow;
  const dsn = (w.__QUIZONLINE_SENTRY_DSN ?? environment.sentryDsn ?? '').trim();
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: w.__QUIZONLINE_SENTRY_ENV ?? (environment.production ? 'production' : 'development'),
    release: w.__QUIZONLINE_SENTRY_RELEASE ?? environment.sentryRelease ?? '',
    // Conservative perf sampling — opt in via runtime injection if needed.
    tracesSampleRate: 0.0,
    // Capture browser-side errors only. Replay / session profiling are off by
    // default to keep the bundle small and the Sentry tier cheap until the
    // operator explicitly opts in.
    sendDefaultPii: false,
  });
}
