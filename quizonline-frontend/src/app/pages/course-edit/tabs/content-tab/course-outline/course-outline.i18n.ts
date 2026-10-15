import {LanguageEnumDto} from '../../../../../api/generated/model/language-enum';
import {pageUiText} from '../../../../../shared/i18n/catalog-registry';

/**
 * Dictionary of ``<app-course-outline>``: the left pane of the course
 * editor (inline create / rename, "⋯" row menu, missing-languages hint).
 * Delete-confirm and fallback wording is copied from ``structureTab``.
 */
export interface CourseOutlineUiText {
  addLesson: string;
  addSection: string;
  newLessonPlaceholder: string;
  newSectionPlaceholder: string;
  /** Prefix of the "missing languages" hint, followed by ``EN, NL``. */
  missingLanguages: string;
  menuAria: string;
  renameAction: string;
  /** aria-label / tooltip of the drag handle on section and lesson rows. */
  dragHandle: string;
  menuPublish: string;
  menuUnpublish: string;
  menuPreviewOn: string;
  menuPreviewOff: string;
  menuTranslations: string;
  menuDelete: string;
  /** INTERP: ``{title}`` — render through ``interp``. */
  confirmDeleteSection: string;
  /** INTERP: ``{title}`` — render through ``interp``. */
  confirmDeleteLesson: string;
  confirmDeleteHeader: string;
  confirmAccept: string;
  confirmReject: string;
  actionFailedToast: string;
  untitledSection: string;
  untitledLesson: string;
}

export function getCourseOutlineUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CourseOutlineUiText {
  return pageUiText<CourseOutlineUiText>('courseOutline', lang);
}
