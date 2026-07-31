import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {pageUiText} from '../../../shared/i18n/catalog-registry';

export interface BillingBannerUiText {
  /** ``{date}`` interpolated. Shown while the free period is still running. */
  approaching: string;
  /** ``{date}`` interpolated. Shown once the free period has ended. */
  expired: string;
  cta: string;
}

export function getBillingBannerUiText(
  lang: LanguageEnumDto | string | null | undefined,
): BillingBannerUiText {
  return pageUiText<BillingBannerUiText>('billingBanner', lang);
}
