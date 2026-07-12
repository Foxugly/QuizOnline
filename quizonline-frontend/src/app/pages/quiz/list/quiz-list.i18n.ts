import { LanguageEnumDto } from '../../../api/generated/model/language-enum';
import {PluralForms} from '../../../shared/i18n/format';
import data from './quiz-list.i18n.json';

export type QuizListUiText = {
  page: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    compose: string;
    quickCreate: string;
  };
  tabs: {
    templates: string;
    sessions: string;
  };
  templates: {
    empty: string;
    headers: {
      title: string;
      mode: string;
      questions: string;
      createdAt: string;
      owner: string;
      public: string;
      active: string;
      available: string;
      availabilityWindow: string;
      actions: string;
    };
    modePractice: string;
    modeExam: string;
    permanent: string;
    yes: string;
    no: string;
    actions: {
      start: string;
      /** INTERP — disabled start tooltip with ``{when}``; render through ``interp``. */
      startDisabledNotYet: string;
      /** INTERP — disabled start tooltip with ``{when}``; render through ``interp``. */
      startDisabledExpired: string;
      startDisabledGeneric: string;
      assign: string;
      results: string;
      edit: string;
      delete: string;
    };
  };
  assignDialog: {
    header: string;
    intro: string;
    noRecipients: string;
    searchPlaceholder: string;
    selectAll: string;
    clearSelection: string;
    roleAll: string;
    submit: string;
    cancel: string;
    roleOwner: string;
    roleManager: string;
    roleMember: string;
  };
  bulk: {
    placeholder: string;
    apply: string;
    activate: string;
    deactivate: string;
    delete: string;
    /** PLURAL — bulk-selection count. Render through ``plural``. */
    selectedCount: PluralForms;
  };
  messages: {
    /** INTERP — "{count} quiz(es) sent."; render through ``interp``. */
    assignSuccess: string;
    assignError: string;
    loadError: string;
    resultsError: string;
    createError: string;
    /** INTERP — pending-approval banner with ``{domains}``; render through ``interp``. */
    pendingApprovalBanner: string;
  };
  welcome: {
    title: string;
    hint: string;
    stepSubjectTitle: string;
    stepSubjectHint: string;
    stepQuestionTitle: string;
    stepQuestionHint: string;
    stepQuizTitle: string;
    stepQuizHint: string;
    ctaSubject: string;
    ctaQuestion: string;
    ctaQuiz: string;
  };
};

const UI_TEXT = data as Record<string, QuizListUiText>;

export function getQuizListUiText(lang: LanguageEnumDto | string | null | undefined): QuizListUiText {
  return UI_TEXT[lang as string] ?? UI_TEXT[LanguageEnumDto.En];
}
