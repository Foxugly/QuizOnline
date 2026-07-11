import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import data from './course-edit.i18n.json';

/**
 * Shell-level labels for the course-edit page. Includes the page title,
 * the four top-level tab labels and the publish/unpublish controls in
 * the page header. Each tab owns its own dictionary so this getter
 * stays narrow and the full course-author experience can grow
 * tab-by-tab without churning the shell.
 */
export interface CourseEditUiText {
  pageTitle: string;
  tabInfo: string;
  tabStructure: string;
  tabEnrollment: string;
  tabAnalytics: string;
  publishButton: string;
  unpublishButton: string;
  publishedBadge: string;
  unpublishedBadge: string;
  publishSuccessToast: string;
  publishErrorToast: string;
  unpublishSuccessToast: string;
  unpublishErrorToast: string;
  loadErrorToast: string;
  loadingMessage: string;
  cloneButton: string;
  exportButton: string;
  exportSuccessToast: string;
  exportErrorToast: string;
  deleteButton: string;
  confirmCloneTitle: string;
  confirmCloneMessage: string;
  confirmCloneAccept: string;
  confirmCloneReject: string;
  confirmDeleteTitle: string;
  confirmDeleteMessage: string;
  confirmDeleteAccept: string;
  confirmDeleteReject: string;
  cloneSuccessToast: string;
  cloneErrorToast: string;
  deleteSuccessToast: string;
  deleteErrorToast: string;
  deleteProtectedToast: string;
}

const CATALOG = data as Record<string, CourseEditUiText>;

export function getCourseEditUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CourseEditUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
