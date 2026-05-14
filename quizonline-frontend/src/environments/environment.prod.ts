export const environment = {
  production: true,
  apiBaseUrl: '',  // Resolved at runtime from window.__QUIZONLINE_API_BASE_URL or same-origin
  appName: 'QuizOnline',
  author: 'Foxugly',
  year: '2025',
  logoSvg: '/qna.svg',
  logoIco: '/favicon.ico',
  logoPng: '/qna.png',
  // Empty by default. The operator injects ``window.__QUIZONLINE_SENTRY_DSN``
  // at deploy time (or overwrites this file in the CI pipeline) to turn
  // error monitoring on without changing app code.
  sentryDsn: '',
  sentryRelease: '',
};
