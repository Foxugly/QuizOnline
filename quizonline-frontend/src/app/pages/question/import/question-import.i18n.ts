import { LanguageEnumDto } from '../../../api/generated/model/language-enum';
import data from './question-import.i18n.json';

export type QuestionImportUiText = {
  title: string;
  subtitle: string;
  back: string;
  explanationTitle: string;
  explanation: string;
  exampleTitle: string;
  exampleDescription: string;
  exampleButton: string;
  uploadTitle: string;
  zipFileReady: string;
  chooseFile: string;
  clearFile: string;
  noFile: string;
  selectedFile: string;
  validationTitle: string;
  formatValid: string;
  formatInvalid: string;
  invalidJson: string;
  rootObjectError: string;
  versionError: string;
  domainObjectError: string;
  subjectsArrayError: string;
  questionsArrayError: string;
  domainIdError: string;
  domainTranslationsError: string;
  /** INTERP — carries ``{item}``; render through ``interp``. */
  subjectObjectError: string;
  /** INTERP — carries ``{item}``; render through ``interp``. */
  questionObjectError: string;
  /** INTERP — carries ``{item}``; render through ``interp``. */
  questionSubjectsReferenceError: string;
  /** INTERP — carries ``{item}``; render through ``interp``. */
  questionDomainError: string;
  /** INTERP — carries ``{item}``; render through ``interp``. */
  questionTranslationsError: string;
  /** INTERP — carries ``{item}`` and ``{lang}``; render through ``interp``. */
  questionTranslationShapeError: string;
  /** INTERP — carries ``{item}``; render through ``interp``. */
  questionSubjectsError: string;
  /** INTERP — carries ``{item}``; render through ``interp``. */
  questionMediaError: string;
  /** INTERP — carries ``{item}``; render through ``interp``. */
  questionAnswersError: string;
  /** INTERP — carries ``{item}``; render through ``interp``. */
  questionCorrectAnswerError: string;
  /** INTERP — carries ``{item}`` and ``{answer}``; render through ``interp``. */
  answerShapeError: string;
  /** INTERP — carries ``{item}`` and ``{answer}``; render through ``interp``. */
  answerTranslationsError: string;
  /** INTERP — carries ``{item}``, ``{answer}`` and ``{lang}``; render through ``interp``. */
  answerTranslationShapeError: string;
  /** INTERP — carries ``{count}``; render through ``interp``. */
  fileValidated: string;
  importLabel: string;
  cancelLabel: string;
  importDone: string;
  /** INTERP — carries ``{count}``; render through ``interp``. */
  importSuccess: string;
  importPartialTitle: string;
  /** INTERP — carries ``{success}`` and ``{failed}``; render through ``interp``. */
  importPartialMessage: string;
  /** INTERP — carries ``{item}``; render through ``interp``. */
  importFailure: string;
};

const UI_TEXT = data as Record<string, QuestionImportUiText>;

export function getQuestionImportUiText(lang: LanguageEnumDto | string | null | undefined): QuestionImportUiText {
  return UI_TEXT[lang as string] ?? UI_TEXT[LanguageEnumDto.En];
}
