import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {pageUiText} from '../../i18n/catalog-registry';

/**
 * i18n for the shared ``<app-lesson-reader>`` — heading + aria-label
 * of the left-side block-outline navigation. Used by both the learner
 * lesson view (``/lesson/{id}``) and the author preview mode of
 * ``/lesson/{id}/edit`` so the two surfaces stay verbatim-identical.
 */
export interface LessonReaderUiText {
  outlineHeading: string;
}

export function getLessonReaderUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LessonReaderUiText {
  return pageUiText<LessonReaderUiText>('lessonReader', lang);
}
