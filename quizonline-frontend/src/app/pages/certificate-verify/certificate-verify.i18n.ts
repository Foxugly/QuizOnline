import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import data from './certificate-verify.i18n.json';

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

const CATALOG = data as Record<string, CertificateVerifyUiText>;

export function getCertificateVerifyUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CertificateVerifyUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
