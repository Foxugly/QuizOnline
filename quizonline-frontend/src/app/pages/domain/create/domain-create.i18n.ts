import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import data from './domain-create.i18n.json';

export type DomainCreateUiText = {
  toastErrorSummary: string;
  errors: {
    loadFailed: string;
    translationFailed: string;
    formInvalid: string;
    missingLanguageIds: string;
    saveFailed: string;
  };
};

const CATALOG = data as Record<string, DomainCreateUiText>;

export function getDomainCreateUiText(
  lang: LanguageEnumDto | string | null | undefined,
): DomainCreateUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
