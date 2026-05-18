import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export interface LmsCertificateVerifyUiText {
  pageTitle: string;
}

export function getLmsCertificateVerifyUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCertificateVerifyUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {pageTitle: 'Vérification de certificat'};
    case LanguageEnumDto.Nl:
    case 'nl':
      return {pageTitle: 'Certificaatverificatie'};
    case LanguageEnumDto.It:
    case 'it':
      return {pageTitle: 'Verifica certificato'};
    case LanguageEnumDto.Es:
    case 'es':
      return {pageTitle: 'Verificar certificado'};
    default:
      return {pageTitle: 'Verify certificate'};
  }
}
