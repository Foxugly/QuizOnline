import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import data from './question-editor-form.i18n.json';

/**
 * Page-scoped labels for the rewritten question editor form
 * (Phase 3.5 of the LMS refactor). The form now hosts three top-level
 * tabs — Question prompt / Answers / Explanation — each of which
 * embeds a multilingual ``<app-block-list-editor>``. These strings
 * cover the tab headers, the answer-row affordances, the language
 * sub-tabs and the translate button.
 */
export interface QuestionEditorFormUiText {
  /** Heading of the prompt blocks tab. */
  tabQuestion: string;
  /** Heading of the answers tab. */
  tabAnswers: string;
  /** Heading of the explanation blocks tab. */
  tabExplanation: string;
  /** "Translate from current tab" button label. */
  translateButton: string;
  /** Toast summary after a translate run. */
  translateSuccessToast: string;
  /** Toast summary when translation fails. */
  translateErrorToast: string;
  /** "Add an answer" CTA below the answer list. */
  addAnswer: string;
  /** Inline label of the per-answer "is_correct" checkbox. */
  correctAnswer: string;
  /** Tooltip / aria label on the "remove answer" trash button. */
  removeAnswer: string;
  /** Confirmation prompt before deleting an answer. */
  confirmRemoveAnswer: string;
  /** Header rendered above the prompt blocks list. */
  promptHeading: string;
  /** Header rendered above the explanation blocks list. */
  explanationHeading: string;
  /** Header rendered above the answers list. */
  answersHeading: string;
  /** Subtitle below the answers heading hint. */
  answersHint: string;
  /** Subtitle for the prompt blocks tab. */
  promptHint: string;
  /** Subtitle for the explanation blocks tab. */
  explanationHint: string;
  /** Empty state when no answers have been added yet. */
  noAnswersYet: string;
  /** Empty state when the question's domain has no allowed languages. */
  noActiveLanguages: string;
  /** INTERP — heading of a single answer card ("Answer 1", …).
   *  Carries an ``{index}`` placeholder; render through ``interp``. */
  answerHeading: string;
}

const DICT = data as Record<string, QuestionEditorFormUiText>;

export function getQuestionEditorFormUiText(
  lang: LanguageEnumDto | string | null | undefined,
): QuestionEditorFormUiText {
  return DICT[lang as string] ?? DICT[LanguageEnumDto.En];
}
