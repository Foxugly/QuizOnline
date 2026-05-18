import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export interface LmsCertificateListUiText {
  pageTitle: string;
}

export function getLmsCertificateListUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCertificateListUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {pageTitle: 'Mes certificats'};
    case LanguageEnumDto.Nl:
    case 'nl':
      return {pageTitle: 'Mijn certificaten'};
    case LanguageEnumDto.It:
    case 'it':
      return {pageTitle: 'I miei certificati'};
    case LanguageEnumDto.Es:
    case 'es':
      return {pageTitle: 'Mis certificados'};
    default:
      return {pageTitle: 'My certificates'};
  }
}
