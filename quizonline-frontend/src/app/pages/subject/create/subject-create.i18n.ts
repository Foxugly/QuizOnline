import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {pageUiText} from '../../../shared/i18n/catalog-registry';

export type SubjectCreateUiText = {
  title: string;
  subtitle: string;
  emptyLanguagesMessage: string;
  /** Toast / banner strings surfaced by ``subject-create.ts``. */
  toast: {
    loadDomainsFailed: string;
    loadDomainFailed: string;
    nameRequired: string;
    createFailed: string;
    translationFailed: string;
  };
};

export function getSubjectCreateUiText(
  lang: LanguageEnumDto | string | null | undefined,
): SubjectCreateUiText {
  return pageUiText<SubjectCreateUiText>('subjectCreate', lang);
}
