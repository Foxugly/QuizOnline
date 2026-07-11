import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import data from './certificate-view.i18n.json';

/**
 * Per-language UI text for the single-certificate detail page.
 *
 * Renders the certificate the caller owns (``GET /api/certificate/{id}/``)
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

const CATALOG = data as Record<string, CertificateViewUiText>;

export function getCertificateViewUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CertificateViewUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
