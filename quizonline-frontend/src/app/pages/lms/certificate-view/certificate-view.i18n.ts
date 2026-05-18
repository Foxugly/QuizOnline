import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

/**
 * Per-language UI text for the single-certificate detail page.
 *
 * Renders the certificate the caller owns (``GET /api/lms/certificate/{id}/``)
 * with its number, course, issue date and a PDF download. The
 * verification token is exposed by the backend, so the public verify
 * link is rendered as well. The course title is localized server-side
 * with a slug fallback, so no client-side fallback string is needed.
 */
export interface LmsCertificateViewUiText {
  pageTitle: string;
  certificateNumberLabel: string;
  courseLabel: string;
  issuedOnLabel: string;
  revokedOnLabel: string;
  downloadButton: string;
  backButton: string;
  verifyLinkLabel: string;
  loadingMessage: string;
  notFoundTitle: string;
  notFoundMessage: string;
  revokedBadge: string;
}

export function getLmsCertificateViewUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCertificateViewUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        pageTitle: 'Certificat',
        certificateNumberLabel: 'Numéro de certificat',
        courseLabel: 'Cours',
        issuedOnLabel: 'Émis le',
        revokedOnLabel: 'Révoqué le',
        downloadButton: 'Télécharger le PDF',
        backButton: 'Retour à mes certificats',
        verifyLinkLabel: 'Lien public de vérification',
        loadingMessage: 'Chargement…',
        notFoundTitle: 'Certificat introuvable',
        notFoundMessage: "Ce certificat n'existe pas ou ne vous appartient pas.",
        revokedBadge: 'RÉVOQUÉ',
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Certificaat',
        certificateNumberLabel: 'Certificaatnummer',
        courseLabel: 'Cursus',
        issuedOnLabel: 'Uitgegeven op',
        revokedOnLabel: 'Ingetrokken op',
        downloadButton: 'PDF downloaden',
        backButton: 'Terug naar mijn certificaten',
        verifyLinkLabel: 'Openbare verificatielink',
        loadingMessage: 'Laden…',
        notFoundTitle: 'Certificaat niet gevonden',
        notFoundMessage: 'Dit certificaat bestaat niet of is niet van jou.',
        revokedBadge: 'INGETROKKEN',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'Certificato',
        certificateNumberLabel: 'Numero certificato',
        courseLabel: 'Corso',
        issuedOnLabel: 'Emesso il',
        revokedOnLabel: 'Revocato il',
        downloadButton: 'Scarica il PDF',
        backButton: 'Torna ai miei certificati',
        verifyLinkLabel: 'Link pubblico di verifica',
        loadingMessage: 'Caricamento…',
        notFoundTitle: 'Certificato non trovato',
        notFoundMessage: 'Questo certificato non esiste o non è tuo.',
        revokedBadge: 'REVOCATO',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Certificado',
        certificateNumberLabel: 'Número de certificado',
        courseLabel: 'Curso',
        issuedOnLabel: 'Emitido el',
        revokedOnLabel: 'Revocado el',
        downloadButton: 'Descargar el PDF',
        backButton: 'Volver a mis certificados',
        verifyLinkLabel: 'Enlace público de verificación',
        loadingMessage: 'Cargando…',
        notFoundTitle: 'Certificado no encontrado',
        notFoundMessage: 'Este certificado no existe o no te pertenece.',
        revokedBadge: 'REVOCADO',
      };
    default:
      return {
        pageTitle: 'Certificate',
        certificateNumberLabel: 'Certificate number',
        courseLabel: 'Course',
        issuedOnLabel: 'Issued on',
        revokedOnLabel: 'Revoked on',
        downloadButton: 'Download PDF',
        backButton: 'Back to my certificates',
        verifyLinkLabel: 'Public verify link',
        loadingMessage: 'Loading…',
        notFoundTitle: 'Certificate not found',
        notFoundMessage: 'This certificate does not exist or is not yours.',
        revokedBadge: 'REVOKED',
      };
  }
}
