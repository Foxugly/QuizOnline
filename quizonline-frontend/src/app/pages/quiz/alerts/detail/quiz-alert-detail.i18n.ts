import {LanguageEnumDto} from '../../../../api/generated/model/language-enum';
import {pageUiText} from '../../../../shared/i18n/catalog-registry';

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

export function getQuizAlertDetailUiText(
  lang: LanguageEnumDto | string | null | undefined,
): QuizAlertDetailUiText {
  return pageUiText<QuizAlertDetailUiText>('quizAlertDetail', lang);
}
