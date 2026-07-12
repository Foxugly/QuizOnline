import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import data from './quiz-create.i18n.json';

export type QuizCreateUiText = {
  textsTab: string;
  configurationTab: string;
  questionsTab: string;
  sectionStatus: string;
  sectionMode: string;
  sectionAvailability: string;
  sectionOrdering: string;
  sectionResult: string;
  sectionDetail: string;
  questionPoolTitle: string;
  questionSearchPlaceholder: string;
  questionSubjectFilter: string;
  questionSubjectFilterPlaceholder: string;
  createQuestion: string;
  selectDomainToLoadQuestions: string;
  loadingQuestions: string;
  noAvailableQuestions: string;
  compositionTitle: string;
  compositionHelp: string;
  compositionEmpty: string;
  weight: string;
  weightHelp: string;
  createTitle: string;
  editTitle: string;
  createSubtitle: string;
  editSubtitle: string;
  createTemplate: string;
  saveTemplate: string;
  mode: string;
  timer: string;
  duration: string;
  active: string;
  public: string;
  permanent: string;
  shuffleQuestions: string;
  startedAt: string;
  endedAt: string;
  resultVisibility: string;
  resultAvailableAt: string;
  detailVisibility: string;
  detailAvailableAt: string;
  quizTitle: string;
  quizTitlePlaceholder: string;
  quizDescription: string;
  composeReservedForOwner: string;
  translationsTitle: string;
  languagesCount: string;
  translateOthers: string;
  translating: string;
  translationHint: string;
  translationRequired: string;
  practiceMode: string;
  examMode: string;
  visibilityImmediate: string;
  visibilityScheduled: string;
  visibilityNever: string;
  dateFormat: string;
  today: string;
  clear: string;
  weekHeader: string;
  dayNames: string[];
  dayNamesShort: string[];
  dayNamesMin: string[];
  monthNames: string[];
  monthNamesShort: string[];
};

const CATALOG = data as Record<string, QuizCreateUiText>;

export function getQuizCreateUiText(
  lang: LanguageEnumDto | string | null | undefined,
): QuizCreateUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.Fr];
}
