import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {pageUiText} from '../../shared/i18n/catalog-registry';

export type QuestionPreviewDialogUiText = {
  header: string;
  loading: string;
  notFound: string;
  loadFailed: string;
};

export function getQuestionPreviewDialogUiText(
  lang: LanguageEnumDto | string | null | undefined,
): QuestionPreviewDialogUiText {
  return pageUiText<QuestionPreviewDialogUiText>('questionPreviewDialog', lang);
}
