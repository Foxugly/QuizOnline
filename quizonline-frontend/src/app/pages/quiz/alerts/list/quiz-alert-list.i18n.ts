import {LanguageEnumDto} from '../../../../api/generated/model/language-enum';
import data from './quiz-alert-list.i18n.json';

export type QuizAlertListUiText = {
  title: string;
  searchPlaceholder: string;
  loading: string;
  statusOptions: {all: string; open: string; closed: string};
  readOptions: {all: string; unread: string; read: string};
  topicQuiz: string;
  /** INTERP — "Question #{id}"; render through ``interp``. */
  questionPrefix: string;
  /** INTERP — "#{order}"; render through ``interp``. */
  questionOrder: string;
  status: {open: string; closed: string; unread: string};
  empty: {title: string; hint: string};
  noMessage: string;
  /** INTERP — assignment preview with ``{title}``; render through ``interp``. */
  assignmentPreview: string;
  /** INTERP — assignment preview with ``{intro}`` and ``{title}``; render through ``interp``. */
  assignmentPreviewWithIntro: string;
};

const DICT = data as Record<string, QuizAlertListUiText>;

export function getQuizAlertListUiText(lang: LanguageEnumDto | string | null | undefined): QuizAlertListUiText {
  return DICT[lang as string] ?? DICT[LanguageEnumDto.En];
}
