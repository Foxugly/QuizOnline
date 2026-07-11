import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import data from './my-invitations.i18n.json';

/**
 * Per-page dictionary for ``/me/invitations`` — the learner-side
 * "My invitations" hub that lists every pending invitation the
 * current user has received, with a deep-link to each acceptance
 * page.
 */
export interface MyInvitationsUiText {
  pageTitle: string;
  loading: string;
  /** INTERP — ``{inviter}``; render via ``interp``. */
  invitationFrom: string;
  /** INTERP — ``{when}``; render via ``interp``. */
  expiresAt: string;
  viewInvitationButton: string;
  viewCourseButton: string;
  emptyTitle: string;
  emptyMessage: string;
  loadErrorToast: string;
  tabPending: string;
  tabHistory: string;
  emptyHistoryTitle: string;
  emptyHistoryMessage: string;
  statusLabels: Record<'pending' | 'accepted' | 'declined' | 'revoked' | 'expired', string>;
  /** INTERP — ``{when}``; render via ``interp``. */
  historyDateLabel: string;
}

const CATALOG = data as Record<string, MyInvitationsUiText>;

export function getMyInvitationsUiText(
  lang: LanguageEnumDto | string | null | undefined,
): MyInvitationsUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
