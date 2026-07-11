import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import data from './donate.i18n.json';

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

const CATALOG = data as Record<string, DonateUiText>;

export function getDonateUiText(lang: LanguageEnumDto | string | null | undefined): DonateUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
