import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import data from './privacy.i18n.json';

export type PrivacyUiText = {
  title: string;
  /** INTERP — ``{date}``; render via ``interp``. */
  lastUpdated: string;
  intro: string;
  sections: Array<{heading: string; body: string}>;
  rightsHeading: string;
  rightsBody: string;
  exportCta: string;
  exportHint: string;
  contactHeading: string;
  /** INTERP — ``{email}``; render via ``interp``. */
  contactBody: string;
};

const CATALOG = data as Record<string, PrivacyUiText>;

export function getPrivacyUiText(
  lang: LanguageEnumDto | string | null | undefined,
): PrivacyUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.Fr];
}
