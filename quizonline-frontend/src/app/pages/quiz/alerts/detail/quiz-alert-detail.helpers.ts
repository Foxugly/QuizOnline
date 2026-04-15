import {LanguageEnumDto} from '../../../../api/generated/model/language-enum';
import {QuizAlertThreadDetailDto} from '../../../../services/quiz-alert/quiz-alert';
import {formatLocalizedDateTime, languageLocale} from '../../../../shared/i18n/date-time';

export function quizAlertDateLocale(lang: LanguageEnumDto): string {
  return languageLocale(lang);
}

export function formatQuizAlertMessageDate(value: string, lang: LanguageEnumDto): string {
  return formatLocalizedDateTime(value, lang, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }) ?? value;
}

export function isClosedThread(thread: QuizAlertThreadDetailDto | null): boolean {
  return thread?.status === 'closed';
}

export function canShowComposer(thread: QuizAlertThreadDetailDto | null): boolean {
  return Boolean(thread && (thread.can_reply || thread.can_manage));
}

export function canSendReply(thread: QuizAlertThreadDetailDto | null): boolean {
  return Boolean(thread && thread.status === 'open' && thread.can_reply);
}
