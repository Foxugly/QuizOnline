import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {pageUiText} from '../../shared/i18n/catalog-registry';

/**
 * Per-language UI text for the "My certificates" page.
 *
 * Renders every active certificate the caller owns. The localized
 * course title comes from the backend (slug fallback applied
 * server-side), so no client-side fallback string is needed.
 */
export interface CertificateListUiText {
  pageTitle: string;
  colNumber: string;
  colCourse: string;
  colIssuedAt: string;
  colExpiresAt: string;
  expiresAtNever: string;
  colActions: string;
  downloadButton: string;
  viewButton: string;
  emptyTitle: string;
  emptyMessage: string;
  exploreButton: string;
  errorTitle: string;
  errorMessage: string;
  retryButton: string;
}

export function getCertificateListUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CertificateListUiText {
  return pageUiText<CertificateListUiText>('certificateList', lang);
}
