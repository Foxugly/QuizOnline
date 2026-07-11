import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import data from './question-preview-dialog.i18n.json';

export type QuestionPreviewDialogUiText = {
  header: string;
  loading: string;
  notFound: string;
  loadFailed: string;
};

const CATALOG = data as Record<string, QuestionPreviewDialogUiText>;

export function getQuestionPreviewDialogUiText(
  lang: LanguageEnumDto | string | null | undefined,
): QuestionPreviewDialogUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.Fr];
}
