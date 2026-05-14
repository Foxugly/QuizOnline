/**
 * Maps a notification ``(kind, payload)`` pair to the in-app route the
 * user expects to land on when they click it. Returns ``null`` when
 * the kind has no obvious destination (the click then just marks the
 * row read without navigating).
 *
 * Keep the kinds and payload keys in sync with
 * ``customuser/notifications.py NOTIFICATION_KINDS`` and the
 * ``payload`` blobs built in ``core/mailers/*``.
 */
export function notificationRouteFor(
  kind: string,
  payload: Record<string, unknown>,
): unknown[] | null {
  const domainId = numberOrNull(payload?.['domain_id']);
  const quizId = numberOrNull(payload?.['quiz_id']);

  switch (kind) {
    case 'domain.join_request.created':
      // Owner / manager lands on the invitations tab where the
      // pending requests sit waiting for moderation.
      return domainId !== null ? ['/domain', domainId, 'edit'] : null;
    case 'domain.join_request.decided':
    case 'domain.join_request.expiry_warning':
      // Requester sees the status of their own requests under
      // /preferences (Domaines tab).
      return ['/preferences'];
    case 'domain.invite.received':
      // The signed accept token lives in the email link, not the
      // payload. The closest in-app surface is the domain page (if
      // the user has already been admitted) or /preferences for the
      // pending list.
      return domainId !== null ? ['/domain', domainId, 'edit'] : ['/preferences'];
    case 'domain.transfer.received':
      // Same as invites — the actual accept lives in the email; surface
      // /preferences as a fallback so the user finds their pending
      // domain transitions there.
      return ['/preferences'];
    case 'quiz.assignment':
    case 'quiz.result_available':
    case 'quiz.detail_available':
      return quizId !== null ? ['/quiz', quizId] : null;
    case 'quiz.completed':
      // Creator lands on the quiz attempt they are now allowed to
      // review.
      return quizId !== null ? ['/quiz', quizId] : null;
    default:
      return null;
  }
}

/** Query params (if any) to apply alongside the route. */
export function notificationQueryFor(
  kind: string,
  _payload: Record<string, unknown>,
): Record<string, string> {
  switch (kind) {
    case 'domain.join_request.created':
      return {tab: 'invitations'};
    case 'domain.join_request.decided':
    case 'domain.join_request.expiry_warning':
    case 'domain.transfer.received':
      return {tab: 'domains'};
    default:
      return {};
  }
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
