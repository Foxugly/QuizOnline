/**
 * Requester-line builder extracted from the (now JSON) ``join-request-decide``
 * catalog. JSON cannot hold functions, so the two per-language templates live
 * in ``join-request-decide.i18n.json`` (``recap.requesterLine``) while this pure
 * helper reproduces the legacy conditional
 * ``Requester: {username}${email ? ` (${email})` : ''}``.
 */
import {interp} from '../../shared/i18n/format';

/** Per-language templates for the requester recap line. */
export interface RequesterLineCopy {
  /** Used when an e-mail is known — interpolates ``{username}`` and ``{email}``. */
  withEmail: string;
  /** Used when no e-mail is available — interpolates ``{username}`` only. */
  withoutEmail: string;
}

/**
 * Build the requester recap line, appending the e-mail in parentheses only
 * when a non-empty ``email`` is provided (mirrors the legacy conditional).
 */
export function formatRequesterLine(
  username: string,
  email: string,
  copy: RequesterLineCopy,
): string {
  return email
    ? interp(copy.withEmail, {username, email})
    : interp(copy.withoutEmail, {username});
}
