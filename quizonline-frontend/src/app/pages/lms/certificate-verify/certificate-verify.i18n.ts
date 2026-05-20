import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

/**
 * Per-language UI text for the PUBLIC certificate verification page.
 *
 * Anonymous endpoint ``GET /api/verify/{token}/`` returns
 * ``{valid, certificate_number, course_title, user_display_name,
 * issued_at, revoked}``. The page reflects three states:
 *
 *   - VALID:    ``valid=true`` — green tag, all fields rendered
 *   - REVOKED:  ``valid=false`` AND ``revoked=true`` — red tag
 *   - INVALID:  ``valid=false`` (or HTTP 404)         — red tag
 */
export interface LmsCertificateVerifyUiText {
  pageTitle: string;
  validHeading: string;
  invalidHeading: string;
  revokedHeading: string;
  issuedToLabel: string;
  courseLabel: string;
  issuedOnLabel: string;
  certificateNumberLabel: string;
  validBadge: string;
  invalidBadge: string;
  revokedBadge: string;
  genericInvalidMessage: string;
  revokedMessage: string;
  loadingMessage: string;
}

export function getLmsCertificateVerifyUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCertificateVerifyUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        pageTitle: 'Vérification de certificat',
        validHeading: 'Certificat valide',
        invalidHeading: 'Certificat invalide',
        revokedHeading: 'Certificat révoqué',
        issuedToLabel: 'Délivré à',
        courseLabel: 'Cours',
        issuedOnLabel: 'Émis le',
        certificateNumberLabel: 'Numéro de certificat',
        validBadge: 'VALIDE',
        invalidBadge: 'INVALIDE',
        revokedBadge: 'RÉVOQUÉ',
        genericInvalidMessage: 'Ce jeton ne correspond à aucun certificat valide.',
        revokedMessage: 'Ce certificat a été révoqué par son émetteur.',
        loadingMessage: 'Chargement…',
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Certificaatverificatie',
        validHeading: 'Geldig certificaat',
        invalidHeading: 'Ongeldig certificaat',
        revokedHeading: 'Ingetrokken certificaat',
        issuedToLabel: 'Uitgegeven aan',
        courseLabel: 'Cursus',
        issuedOnLabel: 'Uitgegeven op',
        certificateNumberLabel: 'Certificaatnummer',
        validBadge: 'GELDIG',
        invalidBadge: 'ONGELDIG',
        revokedBadge: 'INGETROKKEN',
        genericInvalidMessage: 'Dit token komt niet overeen met een geldig certificaat.',
        revokedMessage: 'Dit certificaat is ingetrokken door de uitgever.',
        loadingMessage: 'Laden…',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'Verifica certificato',
        validHeading: 'Certificato valido',
        invalidHeading: 'Certificato non valido',
        revokedHeading: 'Certificato revocato',
        issuedToLabel: 'Rilasciato a',
        courseLabel: 'Corso',
        issuedOnLabel: 'Emesso il',
        certificateNumberLabel: 'Numero certificato',
        validBadge: 'VALIDO',
        invalidBadge: 'NON VALIDO',
        revokedBadge: 'REVOCATO',
        genericInvalidMessage: 'Questo token non corrisponde a nessun certificato valido.',
        revokedMessage: "Questo certificato è stato revocato dall'emittente.",
        loadingMessage: 'Caricamento…',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Verificar certificado',
        validHeading: 'Certificado válido',
        invalidHeading: 'Certificado no válido',
        revokedHeading: 'Certificado revocado',
        issuedToLabel: 'Emitido a',
        courseLabel: 'Curso',
        issuedOnLabel: 'Emitido el',
        certificateNumberLabel: 'Número de certificado',
        validBadge: 'VÁLIDO',
        invalidBadge: 'NO VÁLIDO',
        revokedBadge: 'REVOCADO',
        genericInvalidMessage: 'Este token no coincide con ningún certificado válido.',
        revokedMessage: 'Este certificado ha sido revocado por su emisor.',
        loadingMessage: 'Cargando…',
      };
    default:
      return {
        pageTitle: 'Verify certificate',
        validHeading: 'Valid certificate',
        invalidHeading: 'Invalid certificate',
        revokedHeading: 'Revoked certificate',
        issuedToLabel: 'Issued to',
        courseLabel: 'Course',
        issuedOnLabel: 'Issued on',
        certificateNumberLabel: 'Certificate number',
        validBadge: 'VALID',
        invalidBadge: 'INVALID',
        revokedBadge: 'REVOKED',
        genericInvalidMessage: 'This token does not match a valid certificate.',
        revokedMessage: 'This certificate has been revoked by its issuer.',
        loadingMessage: 'Loading…',
      };
  }
}
