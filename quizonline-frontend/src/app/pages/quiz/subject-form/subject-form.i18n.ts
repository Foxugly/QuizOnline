import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import data from './subject-form.i18n.json';

export type SubjectFormUiText = {
  title: string;
  domain: string;
  domainPlaceholder: string;
  timer: string;
  timerActive: string;
  timerInactive: string;
  duration: string;
  durationSuffix: string;
  subjects: string;
  subjectsPlaceholder: string;
  questionCount: string;
  /** INTERP — variant with the upper bound, e.g. "Number of questions (max: {max})"; render via ``interp``. */
  questionCountWithMax: string;
};

const CATALOG = data as Record<string, SubjectFormUiText>;

export function getSubjectFormUiText(
  lang: LanguageEnumDto | string | null | undefined,
): SubjectFormUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.Fr];
}
