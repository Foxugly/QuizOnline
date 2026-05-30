import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

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
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {outlineHeading: 'Plan de la leçon'};
    case LanguageEnumDto.Nl:
    case 'nl':
      return {outlineHeading: 'Lesoverzicht'};
    case LanguageEnumDto.It:
    case 'it':
      return {outlineHeading: 'Indice della lezione'};
    case LanguageEnumDto.Es:
    case 'es':
      return {outlineHeading: 'Índice de la lección'};
    default:
      return {outlineHeading: 'Lesson outline'};
  }
}
