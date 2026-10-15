import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {pageUiText} from '../../i18n/catalog-registry';

/**
 * Dictionary of ``<app-lesson-content-editor>``: the lesson pane header
 * (prev / next / preview toggle) and the empty state. Block-list strings
 * live in ``block-list-editor.i18n.ts``.
 */
export interface LessonContentEditorUiText {
  /** Single load-error toast: a failed ``GET /api/v1/lesson/{id}/``. */
  blockErrorToast: string;
  emptyTitle: string;
  emptyHint: string;
  previewButton: string;
  editModeButton: string;
  previousLesson: string;
  nextLesson: string;
}

export function getLessonContentEditorUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LessonContentEditorUiText {
  return pageUiText<LessonContentEditorUiText>('lessonContentEditor', lang);
}
