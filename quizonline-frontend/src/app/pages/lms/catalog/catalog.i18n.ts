import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export interface LmsCatalogUiText {
  pageTitle: string;
}

export function getLmsCatalogUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCatalogUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {pageTitle: 'Catalogue des cours'};
    case LanguageEnumDto.Nl:
    case 'nl':
      return {pageTitle: 'Cursuscatalogus'};
    case LanguageEnumDto.It:
    case 'it':
      return {pageTitle: 'Catalogo dei corsi'};
    case LanguageEnumDto.Es:
    case 'es':
      return {pageTitle: 'Catálogo de cursos'};
    default:
      return {pageTitle: 'Course catalog'};
  }
}
