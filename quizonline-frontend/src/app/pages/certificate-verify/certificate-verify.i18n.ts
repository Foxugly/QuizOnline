import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {pageUiText} from '../../shared/i18n/catalog-registry';

/**
 * Per-language UI text for the PUBLIC certificate verification page.
 *
 * Anonymous endpoint ``GET /api/v1/verify/{token}/`` returns
 * ``{valid, certificate_number, course_title, user_display_name,
 * issued_at, revoked}``. The page reflects three states:
 *
 *   - VALID:    ``valid=true`` — green tag, all fields rendered
 *   - REVOKED:  ``valid=false`` AND ``revoked=true`` — red tag
 *   - INVALID:  ``valid=false`` (or HTTP 404)         — red tag
 */
export interface CertificateVerifyUiText {
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

export function getCertificateVerifyUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CertificateVerifyUiText {
  return pageUiText<CertificateVerifyUiText>('certificateVerify', lang);
}
