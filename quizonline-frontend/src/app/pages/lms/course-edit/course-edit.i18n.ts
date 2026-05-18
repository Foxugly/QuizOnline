import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export interface LmsCourseEditUiText {
  pageTitle: string;
}

export function getLmsCourseEditUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCourseEditUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {pageTitle: 'Édition du cours'};
    case LanguageEnumDto.Nl:
    case 'nl':
      return {pageTitle: 'Cursus bewerken'};
    case LanguageEnumDto.It:
    case 'it':
      return {pageTitle: 'Modifica corso'};
    case LanguageEnumDto.Es:
    case 'es':
      return {pageTitle: 'Editar curso'};
    default:
      return {pageTitle: 'Edit course'};
  }
}
