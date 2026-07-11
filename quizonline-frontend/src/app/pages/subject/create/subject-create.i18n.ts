import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import data from './subject-create.i18n.json';

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

const CATALOG = data as Record<string, SubjectCreateUiText>;

export function getSubjectCreateUiText(
  lang: LanguageEnumDto | string | null | undefined,
): SubjectCreateUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.Fr];
}
