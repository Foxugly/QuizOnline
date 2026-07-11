import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import data from './course-create.i18n.json';

/**
 * Page-scoped dictionary for ``/course/new``. Mirrors the shape of
 * ``domain-create.i18n.ts``: a flat ``errors`` bag for ``errText()`` plus
 * stand-alone form labels and helper hints. Five languages (FR/EN/NL/IT/ES)
 * are mandatory — the i18n completeness pre-commit hook fails otherwise.
 */
export interface CourseCreateUiText {
  pageTitle: string;
  fields: {
    level: string;
    enrollmentMode: string;
    title: string;
    titlePlaceholder: string;
    description: string;
    learningObjectives: string;
    learningObjectivesHint: string;
  };
  translateButton: string;
  cancelButton: string;
  submitButton: string;
  toastSuccessSummary: string;
  toastSuccessDetail: string;
  toastErrorSummary: string;
  enrollmentLabels: Record<'open' | 'approval' | 'invite', string>;
  errors: {
    loadFailed: string;
    formInvalid: string;
    saveFailed: string;
    translationFailed: string;
    titleRequired: string;
    noCurrentDomain: string;
    notInstructorOfCurrentDomain: string;
  };
}

const CATALOG = data as Record<string, CourseCreateUiText>;

export function getCourseCreateUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CourseCreateUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
