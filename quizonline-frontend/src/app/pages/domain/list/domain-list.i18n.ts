import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {PluralForms} from '../../../shared/i18n/format';
import data from './domain-list.i18n.json';

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
};

const DICT = data as Record<string, DomainListUiText>;

export function getDomainListUiText(
  lang: LanguageEnumDto | string | null | undefined,
): DomainListUiText {
  return DICT[lang as string] ?? DICT[LanguageEnumDto.En];
}
