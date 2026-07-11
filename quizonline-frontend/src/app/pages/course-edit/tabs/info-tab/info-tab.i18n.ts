import {LanguageEnumDto} from '../../../../api/generated/model/language-enum';
import data from './info-tab.i18n.json';

/**
 * Page-scoped dictionary for the course-edit "Information" tab.
 *
 * The tab exposes the same editable surface as
 * :func:`getCourseCreateUiText` but for an *existing* course:
 *
 *   * primitive metadata (level / enrollment mode / estimated duration
 *     / cover image),
 *   * per-language translation tabs (title / description / learning
 *     objectives),
 *   * a "translate from active tab" companion button, and
 *   * cancel / save footer actions.
 *
 * Five languages (FR/EN/NL/IT/ES) are mandatory — the i18n
 * completeness pre-commit hook fails otherwise.
 */
export interface CourseEditInfoTabUiText {
  heading: string;
  fields: {
    level: string;
    enrollmentMode: string;
    estimatedDuration: string;
    estimatedDurationHint: string;
    issuesCertificate: string;
    issuesCertificateHint: string;
    certificateValidity: string;
    certificateValidityHint: string;
    coverImage: string;
    title: string;
    titlePlaceholder: string;
    description: string;
    learningObjectives: string;
    learningObjectivesHint: string;
  };
  enrollmentLabels: Record<'open' | 'approval' | 'invite', string>;
  inviteOnlyHint: string;
  translateButton: string;
  uploadButton: string;
  removeCoverButton: string;
  clearSelectionButton: string;
  currentCoverLabel: string;
  selectedFileLabel: string;
  noFileSelected: string;
  saveButton: string;
  cancelButton: string;
  errors: {
    formInvalid: string;
    titleRequired: string;
    saveFailed: string;
    translationFailed: string;
    uploadFailed: string;
  };
  toasts: {
    saveSuccess: string;
    errorSummary: string;
  };
}

const CATALOG = data as Record<string, CourseEditInfoTabUiText>;

export function getCourseEditInfoTabUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CourseEditInfoTabUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
