import {isApiUrl} from './runtime-api-base-url';

type RuntimeApiWindow = typeof globalThis & {__QUIZONLINE_API_BASE_URL?: string};

describe('isApiUrl (audit M15)', () => {
  const w = globalThis as RuntimeApiWindow;
  let previous: string | undefined;

  beforeEach(() => {
    previous = w.__QUIZONLINE_API_BASE_URL;
  });

  afterEach(() => {
    if (previous === undefined) {
      delete w.__QUIZONLINE_API_BASE_URL;
    } else {
      w.__QUIZONLINE_API_BASE_URL = previous;
    }
  });

  it('same-origin deployment: only our own /api/v1/ gets the token', () => {
    w.__QUIZONLINE_API_BASE_URL = '';
    expect(isApiUrl('/api/v1/user/me/')).toBe(true);
    expect(isApiUrl(`${window.location.origin}/api/v1/course/`)).toBe(true);
    expect(isApiUrl('https://evil.example/api/v1/user/me/')).toBe(false);
    expect(isApiUrl('https://challenges.cloudflare.com/turnstile/v0/api.js')).toBe(false);
  });

  it('separate API origin: matches that origin only', () => {
    w.__QUIZONLINE_API_BASE_URL = 'https://api.example.test';
    expect(isApiUrl('https://api.example.test/api/v1/course/')).toBe(true);
    expect(isApiUrl('https://api.example.test.evil.example/api/v1/course/')).toBe(false);
    expect(isApiUrl('https://other.example/api/v1/course/')).toBe(false);
    expect(isApiUrl('/api/v1/course/')).toBe(true);
  });
});
