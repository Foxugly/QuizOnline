/**
 * Notification-line logic extracted from the (now JSON) ``ui-text`` catalog.
 *
 * JSON catalogs cannot hold functions, so the two logic-bearing notification
 * keys keep their **strings** in ``ui-text/<lang>.json`` (as copy objects) while
 * the branching lives here, driven by those strings. Both helpers are pure and
 * render through {@link interp}.
 */
import {interp} from './format';

/** Copy for {@link formatRelativeTime}. ``minutesAgo``/``hoursAgo``/``daysAgo``
 *  carry a ``{n}`` placeholder; ``justNow`` is a plain string. */
export interface RelativeCopy {
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
}

/**
 * Render an elapsed duration (in seconds) as a short relative label, reproducing
 * the legacy thresholds: ``<60s`` → just now, ``<60min`` → minutes, ``<24h`` →
 * hours, else days. Negative inputs are clamped to 0.
 */
export function formatRelativeTime(seconds: number, copy: RelativeCopy): string {
  const sec = Math.max(0, Math.round(seconds));
  if (sec < 60) {
    return copy.justNow;
  }
  const m = Math.floor(sec / 60);
  if (m < 60) {
    return interp(copy.minutesAgo, {n: m});
  }
  const h = Math.floor(m / 60);
  if (h < 24) {
    return interp(copy.hoursAgo, {n: h});
  }
  const d = Math.floor(h / 24);
  return interp(copy.daysAgo, {n: d});
}

/** Copy for {@link buildNotificationLine}. Per-kind templates plus the three
 *  actor fallbacks used when the payload omits a username. Placeholders:
 *  ``{ru}`` requester, ``{iu}`` inviter, ``{ii}`` initiator, ``{dn}`` domain
 *  name, ``{title}`` template title, ``{user}`` acting user. */
export interface KindLineCopy {
  joinRequestCreated: string;
  joinRequestApproved: string;
  joinRequestRejected: string;
  joinRequestExpiry: string;
  inviteReceived: string;
  transferReceived: string;
  quizAssignment: string;
  quizCompleted: string;
  quizResult: string;
  quizDetail: string;
  defaultUser: string;
  defaultSomeone: string;
  defaultOwner: string;
}

/**
 * Build the human-readable line for a notification ``kind`` from its ``payload``,
 * reproducing the legacy switch (including the ``{ru || defaultUser}`` style
 * fallbacks and the ``default: return kind``). Payload extraction:
 * ``domain_name`` → ``dn``, ``requester_username`` → ``ru``,
 * ``inviter_username`` → ``iu``, ``initiator_username`` → ``ii``,
 * ``outcome`` → ``oc``, ``template_title`` → ``title``,
 * ``user_username`` → ``user``.
 */
export function buildNotificationLine(
  kind: string,
  payload: Record<string, unknown> | null | undefined,
  copy: KindLineCopy,
): string {
  const p = (payload ?? {}) as Record<string, unknown>;
  const dn = String(p['domain_name'] ?? '');
  const ru = String(p['requester_username'] ?? '');
  const iu = String(p['inviter_username'] ?? '');
  const ii = String(p['initiator_username'] ?? '');
  const oc = String(p['outcome'] ?? '');
  const title = String(p['template_title'] ?? '');
  const user = String(p['user_username'] ?? '');

  switch (kind) {
    case 'domain.join_request.created':
      return interp(copy.joinRequestCreated, {ru: ru || copy.defaultUser, dn});
    case 'domain.join_request.decided':
      return interp(oc === 'approved' ? copy.joinRequestApproved : copy.joinRequestRejected, {dn});
    case 'domain.join_request.expiry_warning':
      return interp(copy.joinRequestExpiry, {dn});
    case 'domain.invite.received':
      return interp(copy.inviteReceived, {iu: iu || copy.defaultSomeone, dn});
    case 'domain.transfer.received':
      return interp(copy.transferReceived, {ii: ii || copy.defaultOwner, dn});
    case 'quiz.assignment':
      return interp(copy.quizAssignment, {title});
    case 'quiz.completed':
      return interp(copy.quizCompleted, {user: user || copy.defaultUser, title});
    case 'quiz.result_available':
      return interp(copy.quizResult, {title});
    case 'quiz.detail_available':
      return interp(copy.quizDetail, {title});
    default:
      return kind;
  }
}
