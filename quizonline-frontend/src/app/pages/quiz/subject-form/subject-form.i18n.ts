import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {pageUiText} from '../../../shared/i18n/catalog-registry';

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

export function getSubjectFormUiText(
  lang: LanguageEnumDto | string | null | undefined,
): SubjectFormUiText {
  return pageUiText<SubjectFormUiText>('subjectForm', lang);
}
