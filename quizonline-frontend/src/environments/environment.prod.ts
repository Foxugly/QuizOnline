export const environment = {
  production: true,
  apiBaseUrl: '',  // Resolved at runtime from window.__QUIZONLINE_API_BASE_URL or same-origin
  appName: 'QuizOnline',
  // Keep in sync with ``package.json#version`` — surfaced in the
  // footer so QA / users can report bugs against a precise build.
  version: '1.1.0',
  author: 'Foxugly',
  year: '2025',
  logoSvg: '/qna.svg',
  logoIco: '/favicon.ico',
  logoPng: '/qna.png',
  // Empty by default. The operator injects ``window.__QUIZONLINE_SENTRY_DSN``
  // at deploy time (or overwrites this file in the CI pipeline) to turn
  // error monitoring on without changing app code.
  //
  // The DSN can point at Sentry, GlitchTip Cloud (free tier, 1k
  // events/month) or a self-hosted GlitchTip — the SDK protocol is the
  // same, so swapping ingest providers is a single env-var change.
  sentryDsn: '',
  sentryRelease: '',
};
