import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import data from './course-detail.i18n.json';

export interface CourseDetailUiText {
  pageTitle: string;
  loading: string;
  sectionsHeading: string;
  learningObjectivesHeading: string;
  durationLabel: string;
  enrollButton: string;
  acceptInviteButton: string;
  continueButton: string;
  editButton: string;
  enrolledBadge: string;
  pendingBadge: string;
  startLessonButton: string;
  completedLessonBadge: string;
  previewBadge: string;
  inviteOnlyMessage: string;
  approvalPendingMessage: string;
  /** INTERP: ``{inviter}`` — render through ``interp``. */
  invitedByBanner: string;
  enrollSuccessToast: string;
  enrollErrorToast: string;
  acceptInviteSuccessToast: string;
  acceptInviteErrorToast: string;
  emptyContentTitle: string;
  emptyContentMessage: string;
}

const CATALOG = data as Record<string, CourseDetailUiText>;

export function getCourseDetailUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CourseDetailUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
