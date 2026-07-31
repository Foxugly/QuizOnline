import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {pageUiText} from '../../shared/i18n/catalog-registry';

/**
 * Per-page dictionary for the invitee-side acceptance page at
 * ``/course-invite/:token``. Surfaces the labels needed to render
 * "X has invited you to Y" plus the Accept / Decline CTAs and the
 * outcome / error messages.
 */
export interface CourseInviteAcceptUiText {
  pageTitle: string;
  loadingMessage: string;
  /** INTERP: ``{inviter}``, ``{course}`` — render through ``interp``. */
  invitationFrom: string;
  /** INTERP: ``{when}`` — render through ``interp``. */
  expiresAt: string;
  /** INTERP: ``{minutes}`` — render through ``interp``. */
  durationLabel: string;
  levelLabel: string;
  learningObjectivesHeading: string;
  levelChoices: Record<'beginner' | 'intermediate' | 'advanced', string>;
  acceptButton: string;
  declineButton: string;
  declineConfirmHeader: string;
  /** INTERP: ``{courseTitle}`` — render through ``interp``. */
  declineConfirmMessage: string;
  declineConfirmAccept: string;
  declineConfirmReject: string;
  backToCatalogButton: string;
  goToCourseButton: string;

  acceptedTitle: string;
  acceptedMessage: string;
  acceptedRedirectHint: string;
  declinedTitle: string;
  declinedMessage: string;
  revokedTitle: string;
  revokedMessage: string;
  expiredTitle: string;
  expiredMessage: string;
  notFoundTitle: string;
  notFoundMessage: string;
  forbiddenTitle: string;
  forbiddenMessage: string;

  acceptSuccessToast: string;
  acceptErrorToast: string;
  declineSuccessToast: string;
  declineErrorToast: string;
}

export function getCourseInviteAcceptUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CourseInviteAcceptUiText {
  return pageUiText<CourseInviteAcceptUiText>('courseInviteAccept', lang);
}
