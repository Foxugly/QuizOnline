import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export interface LmsLessonEditUiText {
  pageTitle: string;
}

export function getLmsLessonEditUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsLessonEditUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {pageTitle: 'Édition de la leçon'};
    case LanguageEnumDto.Nl:
    case 'nl':
      return {pageTitle: 'Les bewerken'};
    case LanguageEnumDto.It:
    case 'it':
      return {pageTitle: 'Modifica lezione'};
    case LanguageEnumDto.Es:
    case 'es':
      return {pageTitle: 'Editar lección'};
    default:
      return {pageTitle: 'Edit lesson'};
  }
}
