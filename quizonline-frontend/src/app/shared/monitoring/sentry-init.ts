import {ErrorHandler, Injectable} from '@angular/core';

import {environment} from '../../../environments/environment';
import {scrubBreadcrumb, scrubEvent} from './sentry-scrub';

type SentryModule = typeof import('@sentry/angular');

/** Set once the lazily-imported SDK is initialised. */
let sentry: SentryModule | null = null;

type RuntimeSentryWindow = typeof globalThis & {
  __QUIZONLINE_SENTRY_DSN?: string;
  __QUIZONLINE_SENTRY_ENV?: string;
  __QUIZONLINE_SENTRY_RELEASE?: string;
};

/**
 * Opt-in Sentry-compatible error reporter.
 *
 * The DSN can point at any Sentry-protocol ingest endpoint:
 *   - Sentry (sentry.io) — Developer plan is free up to 5k errors/month.
 *   - GlitchTip Cloud (app.glitchtip.com) — open-source, fully Sentry-SDK
 *     compatible, free tier 1k events/month.
 *   - Self-hosted GlitchTip — single docker-compose, no recurring cost.
 *
 * Resolution order for the DSN:
 *   1. ``window.__QUIZONLINE_SENTRY_DSN`` — runtime-injected via the
 *      deployment template (same pattern as ``__QUIZONLINE_API_BASE_URL``).
 *      Lets you rotate the DSN — or swap provider — without rebuilding
 *      the Angular bundle.
 *   2. ``environment.sentryDsn`` — build-time. Empty by default in both
 *      environment.ts and environment.prod.ts so dev builds never report.
 *
 * If neither is set, the SDK is never even loaded — keeping the initial
 * bundle small for users who run without monitoring. The dynamic import
 * also means an unconfigured/forgotten reporting endpoint is harmless.
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
    environment: w.__QUIZONLINE_SENTRY_ENV || (environment.production ? 'production' : 'development'),
    // nginx injects an empty string when SSM has no SENTRY_RELEASE: fall
    // back to the build's own release (the git SHA stamped by deploy.yml).
    release: w.__QUIZONLINE_SENTRY_RELEASE || environment.sentryRelease || undefined,
    tracesSampleRate: 0.0,
    sendDefaultPii: false,
    // One-time tokens live in some route paths: never ship them.
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
  });
  sentry = Sentry;
}

/**
 * Angular routes errors it catches (templates, lifecycle hooks, zone
 * tasks) to the ``ErrorHandler`` — not to ``window.onerror`` — so the
 * SDK's global handlers never saw them (audit I9). This handler keeps
 * the console output and forwards to Sentry once the SDK is loaded.
 */
@Injectable()
export class SentryErrorHandler extends ErrorHandler {
  override handleError(error: unknown): void {
    super.handleError(error);
    sentry?.captureException(error);
  }
}
