import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {PluralForms} from '../../../shared/i18n/format';
import {pageUiText} from '../../../shared/i18n/catalog-registry';

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

export function getSubjectListUiText(
  lang: LanguageEnumDto | string | null | undefined,
): SubjectListUiText {
  return pageUiText<SubjectListUiText>('subjectList', lang);
}
