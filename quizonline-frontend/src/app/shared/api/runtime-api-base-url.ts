import {environment} from '../../../environments/environment';

type RuntimeApiWindow = typeof globalThis & {
  __QUIZONLINE_API_BASE_URL?: string;
};

function resolveLocalDevApiBaseUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const {hostname, protocol} = window.location;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return null;
  }

  const apiProtocol = protocol === 'https:' ? 'https:' : 'http:';
  return `${apiProtocol}//${hostname}:8000`;
}

export function resolveApiBaseUrl(): string {
  return (
    (globalThis as RuntimeApiWindow).__QUIZONLINE_API_BASE_URL
    ?? resolveLocalDevApiBaseUrl()
    ?? environment.apiBaseUrl
  );
}

/**
 * Whether ``url`` targets our API (and so may carry the bearer token).
 * Compares parsed origins (audit M15): with a same-origin deployment
 * (``apiBaseUrl === ''``) the old prefix test matched EVERY absolute URL,
 * so a request to a third-party origin would have carried the token.
 */
export function isApiUrl(url: string): boolean {
  const here = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  let target: URL;
  try {
    target = new URL(url, here);
  } catch {
    return false;
  }

  // Relative ``/api/v1/...`` (or an absolute URL on the page's origin).
  if (target.origin === here && target.pathname.startsWith('/api/v1/')) {
    return true;
  }

  const base = resolveApiBaseUrl().replace(/\/+$/, '');
  if (!base) {
    return false;
  }
  let apiRoot: URL;
  try {
    apiRoot = new URL(base, here);
  } catch {
    return false;
  }
  const rootPath = apiRoot.pathname.replace(/\/+$/, '');
  return (
    target.origin === apiRoot.origin
    && (target.pathname === rootPath || target.pathname.startsWith(`${rootPath}/`))
  );
}
