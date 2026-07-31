import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {PluralForms} from '../../../shared/i18n/format';
import {pageUiText} from '../../../shared/i18n/catalog-registry';

export type DomainListUiText = {
  title: string;
  searchPlaceholder: string;
  colName: string;
  colSubjects: string;
  colQuestions: string;
  colStatus: string;
  colPendingRequests: string;
  colActions: string;
  bulkPlaceholder: string;
  bulkApply: string;
  bulkActivate: string;
  bulkDeactivate: string;
  bulkDelete: string;
  /** PLURAL — bulk-selection count, e.g. "3 selected". Render through ``plural``. */
  bulkSelectedCount: PluralForms;
  bulkDeleteHeader: string;
  /** PLURAL — bulk-delete confirmation. Render through ``plural``. */
  bulkDeleteConfirm: PluralForms;
  bulkConfirmCancel: string;
  bulkErrorToast: string;
  errorTitle: string;
  errorMessage: string;
  retryButton: string;
  subscriptionAction: string;
};

export function getDomainListUiText(
  lang: LanguageEnumDto | string | null | undefined,
): DomainListUiText {
  return pageUiText<DomainListUiText>('domainList', lang);
}
