export const environment = {
  production: false,
  apiBaseUrl: 'http://127.0.0.1:8000',
  appName: "QuizOnline",
  // Keep in sync with ``package.json#version`` — surfaced in the
  // footer so QA / users can report bugs against a precise build.
  version: "1.1.0",
  author : "Foxugly",
  year : "2025",
  logoSvg : "/qna.svg",
  logoIco : "/favicon.ico",
  logoPng : "/qna.png",
  // Error monitoring — empty in dev. Set via build-time replacement or
  // the runtime ``window.__QUIZONLINE_SENTRY_DSN`` injection.
  sentryDsn: '',
  // Mirrors ``version`` above so every captured error in Sentry /
  // GlitchTip is tagged with the precise build it came from. Update
  // both in lockstep with ``package.json#version``.
  sentryRelease: '1.1.0',
  //apiUserPath: 'user/',
  //apiUserPreferencesPath: 'user/me/',
  //apiSubjectPath: 'subject/',
  //apiQuestionPath: 'question/',
  //apiQuizPath: 'quiz/',

};


