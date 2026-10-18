/**
 * Strip one-time tokens from URLs before they reach Sentry (audit M13).
 *
 * Several public routes carry a secret in the path (magic link, password
 * reset, e-mail confirmation, invitations, ownership transfer). The SDK
 * records the page URL on every event and navigation / fetch breadcrumb,
 * so without this a captured error on one of those pages would ship a
 * still-valid credential to the error tracker.
 */
const TOKEN_ROUTES: readonly RegExp[] = [
  /(\/auth\/magic\/)[^/?#]+/g,
  /(\/user\/reset-password\/)[^/?#]+\/[^/?#]+/g,
  /(\/user\/confirm-email\/)[^/?#]+\/[^/?#]+/g,
  /(\/invite\/accept\/)[^/?#]+/g,
  /(\/transfer\/accept\/)[^/?#]+/g,
  /(\/course-invite\/)[^/?#]+/g,
  /(\/join-request\/decide\/)[^/?#]+/g,
];
// Unanchored on purpose: the same patterns also catch the API calls that
// embed these tokens (``/api/v1/domain/transfer/accept/<token>/``, ...).

export const SCRUBBED = '[redacted]';

export function scrubTokenUrl<T>(value: T): T {
  if (typeof value !== 'string') {
    return value;
  }
  let out: string = value;
  for (const pattern of TOKEN_ROUTES) {
    out = out.replace(pattern, `$1${SCRUBBED}`);
  }
  return out as T;
}

type Breadcrumbish = {data?: Record<string, unknown> | null; message?: string} | null;

export function scrubBreadcrumb<B extends Breadcrumbish>(crumb: B): B {
  if (!crumb) {
    return crumb;
  }
  if (crumb.data) {
    for (const key of ['url', 'from', 'to']) {
      if (key in crumb.data) {
        crumb.data[key] = scrubTokenUrl(crumb.data[key]);
      }
    }
  }
  if (crumb.message) {
    crumb.message = scrubTokenUrl(crumb.message);
  }
  return crumb;
}

type Eventish = {
  request?: {url?: string; headers?: Record<string, string>} | null;
  transaction?: string;
  breadcrumbs?: Breadcrumbish[];
  tags?: Record<string, unknown>;
} | null;

export function scrubEvent<E extends Eventish>(event: E): E {
  if (!event) {
    return event;
  }
  if (event.request?.url) {
    event.request.url = scrubTokenUrl(event.request.url);
  }
  if (event.request?.headers?.['Referer']) {
    event.request.headers['Referer'] = scrubTokenUrl(event.request.headers['Referer']);
  }
  if (event.transaction) {
    event.transaction = scrubTokenUrl(event.transaction);
  }
  event.breadcrumbs?.forEach((crumb) => scrubBreadcrumb(crumb));
  return event;
}
