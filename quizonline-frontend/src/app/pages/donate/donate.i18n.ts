import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {pageUiText} from '../../shared/i18n/catalog-registry';

export type DonateUiText = {
  whyTitle: string;
  reasons: Array<{icon: string; title: string; description: string}>;
  ctaTitle: string;
  ctaDescription: string;
  ctaButton: string;
  ctaNote: string;
  thanksTitle: string;
  thanksDescription: string;
};

export function getDonateUiText(
  lang: LanguageEnumDto | string | null | undefined,
): DonateUiText {
  return pageUiText<DonateUiText>('donate', lang);
}
