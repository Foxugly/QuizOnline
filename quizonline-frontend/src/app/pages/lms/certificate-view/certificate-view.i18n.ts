import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export interface LmsCertificateViewUiText {
  pageTitle: string;
}

export function getLmsCertificateViewUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCertificateViewUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {pageTitle: 'Certificat'};
    case LanguageEnumDto.Nl:
    case 'nl':
      return {pageTitle: 'Certificaat'};
    case LanguageEnumDto.It:
    case 'it':
      return {pageTitle: 'Certificato'};
    case LanguageEnumDto.Es:
    case 'es':
      return {pageTitle: 'Certificado'};
    default:
      return {pageTitle: 'Certificate'};
  }
}
