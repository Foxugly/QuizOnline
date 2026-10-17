import type {UiText} from '../i18n/ui-text/types';

/** Application error codes the auth endpoints return in their body. */
const KNOWN_CODES = ['captcha_failed', 'email_not_confirmed'] as const;

/**
 * Translated message for a failed auth request (fleet rule, STANDARD
 * « Pages d'authentification »): the copy is picked from the HTTP status or
 * a known application ``code`` — the raw backend ``detail`` is never shown,
 * since it is not localised (simplejwt answers in English, our views in
 * French).
 *
 * - network error (status 0) or 5xx → generic error
 * - 429 → too many attempts
 * - ``code: captcha_failed`` → captcha message
 * - ``code: email_not_confirmed`` → confirm-your-email message
 * - 400 / 401 when ``credentials`` is set (login) → invalid credentials
 * - anything else → ``fallback``
 */
export function authErrorMessage(
  err: unknown,
  ui: UiText,
  options: {fallback: string; credentials?: boolean},
): string {
  const e = (err ?? {}) as {status?: number; error?: unknown};
  const status = typeof e.status === 'number' ? e.status : 0;
  const body = e.error && typeof e.error === 'object' ? (e.error as {code?: unknown}) : null;
  const code = typeof body?.code === 'string' ? body.code : null;

  if (status === 0 || status >= 500) {
    return ui.authErrors.generic;
  }
  if (status === 429) {
    return ui.authErrors.tooManyAttempts;
  }
  if (code && (KNOWN_CODES as readonly string[]).includes(code)) {
    return code === 'captcha_failed' ? ui.authErrors.captcha : ui.login.confirmEmailRequired;
  }
  if (options.credentials && (status === 400 || status === 401)) {
    return ui.login.invalidCredentials;
  }
  return options.fallback;
}
