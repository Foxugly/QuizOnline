import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {pageUiText} from '../../shared/i18n/catalog-registry';

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

export function getPrivacyUiText(
  lang: LanguageEnumDto | string | null | undefined,
): PrivacyUiText {
  return pageUiText<PrivacyUiText>('privacy', lang);
}
