import {LanguageEnumDto} from '../../../../api/generated/model/language-enum';
import {pageUiText} from '../../../../shared/i18n/catalog-registry';

/** Dictionary of the course editor's "Content" tab (outline + lesson panes). */
export interface CourseEditContentTabUiText {
  emptyTitle: string;
  emptyHint: string;
  /** Narrow screens only: shows / hides the outline pane. */
  outlineToggle: string;
  /** ``?lesson=`` points at a lesson that is not in this course. */
  unknownLessonToast: string;
}

export function getCourseEditContentTabUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CourseEditContentTabUiText {
  return pageUiText<CourseEditContentTabUiText>('contentTab', lang);
}
