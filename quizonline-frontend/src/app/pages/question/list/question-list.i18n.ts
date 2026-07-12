import { LanguageEnumDto } from '../../../api/generated/model/language-enum';
import {PluralForms} from '../../../shared/i18n/format';
import data from './question-list.i18n.json';

export type QuestionListUiText = {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  subjectsPlaceholder: string;
  newQuestion: string;
  importQuestions: string;
  exportQuestions: string;
  /** INTERP — "Export (n)"; render through ``interp`` with ``{n}``. */
  exportSelected: string;
  selectAll: string;
  unselectAll: string;
  titleCol: string;
  activeCol: string;
  modesCol: string;
  domainsCol: string;
  subjectsCol: string;
  actionsCol: string;
  practice: string;
  exam: string;
  bulkPlaceholder: string;
  bulkApply: string;
  bulkExport: string;
  bulkActivate: string;
  bulkDeactivate: string;
  bulkAddPractice: string;
  bulkRemovePractice: string;
  bulkAddExam: string;
  bulkRemoveExam: string;
  bulkDelete: string;
  /** PLURAL — bulk-selection count. Render through ``plural``. */
  bulkSelectedCount: PluralForms;
  /** PLURAL — bulk-delete confirmation. Render through ``plural``. */
  bulkDeleteConfirm: PluralForms;
  bulkConfirmCancel: string;
};

const UI_TEXT = data as Record<string, QuestionListUiText>;

export function getQuestionListUiText(lang: LanguageEnumDto | string | null | undefined): QuestionListUiText {
  return UI_TEXT[lang as string] ?? UI_TEXT[LanguageEnumDto.En];
}
