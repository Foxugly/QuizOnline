import {LanguageEnumDto} from '../../../../api/generated/model/language-enum';
import data from './quiz-alert-detail.i18n.json';

export type QuizAlertDetailUiText = {
  back: string;
  loadingConversation: string;
  quizBadge: string;
  statusOpen: string;
  statusClosed: string;
  questionLabel: string;
  userFallback: string;
  unreadBadge: string;
  replyPlaceholder: string;
  conversationClosedNote: string;
  reporterReplyToggle: string;
  assignmentIntroFallback: string;
  errors: {
    invalidMessageId: string;
    loadFailed: string;
    sendFailed: string;
    updateFailed: string;
    closeFailed: string;
    reopenFailed: string;
  };
};

const CATALOG = data as Record<string, QuizAlertDetailUiText>;

export function getQuizAlertDetailUiText(
  lang: LanguageEnumDto | string | null | undefined,
): QuizAlertDetailUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
