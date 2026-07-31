import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {pageUiText} from '../../shared/i18n/catalog-registry';

/**
 * Page-scoped dictionary for ``/lesson/{id}/edit``. The shell-level
 * strings (page title, preview / edit toggle labels, outline heading,
 * empty-state title + hint) live here. Everything block-list-related
 * (add bar, delete aria, reorder toasts, …) is owned by the shared
 * ``<app-block-list-editor>`` and lives in
 * ``shared/learning/block-list-editor/block-list-editor.i18n.ts``.
 */
export interface LessonEditUiText {
  pageTitle: string;
  /** Single load-error toast — surfaces a backend failure when the
   *  initial ``GET /api/v1/lesson/{id}/`` rejects. */
  blockErrorToast: string;
  emptyTitle: string;
  emptyHint: string;
  /** Toggle label that swaps the editor for the in-page learner preview. */
  previewButton: string;
  /** Toggle label shown when the preview is active (switches back to edit mode). */
  editModeButton: string;
}

export function getLessonEditUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LessonEditUiText {
  return pageUiText<LessonEditUiText>('lessonEdit', lang);
}
