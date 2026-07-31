import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {pageUiText} from '../../shared/i18n/catalog-registry';

/**
 * Per-language UI text for the single-certificate detail page.
 *
 * Renders the certificate the caller owns (``GET /api/v1/certificate/{id}/``)
 * with its number, course, issue date and a PDF download. The
 * verification token is exposed by the backend, so the public verify
 * link is rendered as well. The course title is localized server-side
 * with a slug fallback, so no client-side fallback string is needed.
 */
export interface CertificateViewUiText {
  pageTitle: string;
  certificateNumberLabel: string;
  courseLabel: string;
  issuedOnLabel: string;
  expiresOnLabel: string;
  revokedOnLabel: string;
  downloadButton: string;
  backButton: string;
  verifyLinkLabel: string;
  loadingMessage: string;
  notFoundTitle: string;
  notFoundMessage: string;
  revokedBadge: string;
}

export function getCertificateViewUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CertificateViewUiText {
  return pageUiText<CertificateViewUiText>('certificateView', lang);
}
