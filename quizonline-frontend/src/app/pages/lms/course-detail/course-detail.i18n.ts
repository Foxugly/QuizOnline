import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export interface LmsCourseDetailUiText {
  pageTitle: string;
}

export function getLmsCourseDetailUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCourseDetailUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {pageTitle: 'Cours'};
    case LanguageEnumDto.Nl:
    case 'nl':
      return {pageTitle: 'Cursus'};
    case LanguageEnumDto.It:
    case 'it':
      return {pageTitle: 'Corso'};
    case LanguageEnumDto.Es:
    case 'es':
      return {pageTitle: 'Curso'};
    default:
      return {pageTitle: 'Course'};
  }
}
