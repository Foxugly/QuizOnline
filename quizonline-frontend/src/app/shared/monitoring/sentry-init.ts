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
 * If neither is set, the SDK is never even loaded — keeping the initial
 * bundle small for users who run without monitoring. The dynamic import
 * also means an unconfigured/forgotten Sentry org is harmless.
 */
export async function initSentry(): Promise<void> {
  const w = globalThis as RuntimeSentryWindow;
  const dsn = (w.__QUIZONLINE_SENTRY_DSN ?? environment.sentryDsn ?? '').trim();
  if (!dsn) {
    return;
  }

  // Dynamic import keeps ~50 kB of SDK code out of the initial bundle.
  // The download happens in parallel with the Angular bootstrap, so the
  // delay before Sentry is ready is one extra HTTP round-trip — fine for
  // a frontend that only needs to capture user-facing errors (not the
  // bundle's own initialisation crashes, which are routed to the console
  // anyway).
  const Sentry = await import('@sentry/angular');

  Sentry.init({
    dsn,
    environment: w.__QUIZONLINE_SENTRY_ENV ?? (environment.production ? 'production' : 'development'),
    release: w.__QUIZONLINE_SENTRY_RELEASE ?? environment.sentryRelease ?? '',
    tracesSampleRate: 0.0,
    sendDefaultPii: false,
  });
}
