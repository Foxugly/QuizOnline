import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {pageUiText} from '../../../shared/i18n/catalog-registry';

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

export function getDomainCreateUiText(
  lang: LanguageEnumDto | string | null | undefined,
): DomainCreateUiText {
  return pageUiText<DomainCreateUiText>('domainCreate', lang);
}
