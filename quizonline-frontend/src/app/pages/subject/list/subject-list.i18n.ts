import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {PluralForms} from '../../../shared/i18n/format';
import data from './subject-list.i18n.json';

export type SubjectListUiText = {
  title: string;
  searchPlaceholder: string;
  bulk: {
    placeholder: string;
    apply: string;
    /** PLURAL — bulk-selection count, e.g. "3 selected". Render through ``plural``. */
    selectedCount: PluralForms;
  };
  columns: {
    name: string;
    active: string;
    domain: string;
    questions: string;
    actions: string;
  };
};

const UI_TEXT = data as Record<string, SubjectListUiText>;

export function getSubjectListUiText(
  lang: LanguageEnumDto | string | null | undefined,
): SubjectListUiText {
  return UI_TEXT[lang as string] ?? UI_TEXT[LanguageEnumDto.Fr];
}
