import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export interface LmsLessonViewUiText {
  pageTitle: string;
}

export function getLmsLessonViewUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsLessonViewUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {pageTitle: 'Leçon'};
    case LanguageEnumDto.Nl:
    case 'nl':
      return {pageTitle: 'Les'};
    case LanguageEnumDto.It:
    case 'it':
      return {pageTitle: 'Lezione'};
    case LanguageEnumDto.Es:
    case 'es':
      return {pageTitle: 'Lección'};
    default:
      return {pageTitle: 'Lesson'};
  }
}
