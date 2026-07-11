import {LanguageEnumDto} from '../../../../api/generated/model/language-enum';
import data from './structure-tab.i18n.json';

/**
 * Per-tab dictionary for the "Structure" tab where sections and lessons
 * are managed: drag-and-drop reorder, add / edit / delete dialogs, and
 * per-row publish + preview toggles. Every visible string surfaced by
 * the tab — including the create / edit dialog labels and toast
 * messages — flows through this getter so the 5 supported languages
 * stay in lock-step.
 */
export interface CourseEditStructureTabUiText {
  heading: string;
  subtitle: string;

  addSectionButton: string;
  addLessonButton: string;
  editButton: string;
  deleteButton: string;
  editContentButton: string;

  isPublishedLabel: string;
  isPreviewLabel: string;

  /** INTERP: ``{title}`` — render through ``interp``. */
  confirmDeleteSection: string;
  /** INTERP: ``{title}`` — render through ``interp``. */
  confirmDeleteLesson: string;
  confirmDeleteHeader: string;
  confirmAccept: string;
  confirmReject: string;

  sectionDialog: {
    titleCreate: string;
    titleEdit: string;
    titleField: string;
    descriptionField: string;
    isPublishedField: string;
    submitButton: string;
    cancelButton: string;
    translateButton: string;
    translationFailed: string;
  };

  lessonDialog: {
    titleCreate: string;
    titleEdit: string;
    titleField: string;
    isPreviewField: string;
    isPublishedField: string;
    submitButton: string;
    cancelButton: string;
    translateButton: string;
    translationFailed: string;
  };

  sectionCreatedToast: string;
  sectionUpdatedToast: string;
  sectionDeletedToast: string;
  lessonCreatedToast: string;
  lessonUpdatedToast: string;
  lessonDeletedToast: string;
  reorderSuccessToast: string;
  actionFailedToast: string;
  titleRequiredToast: string;

  untitledSection: string;
  untitledLesson: string;

  emptyTitle: string;
  emptyMessage: string;

  dragHandleAria: string;
  sectionAria: string;
  lessonAria: string;
}

const CATALOG = data as Record<string, CourseEditStructureTabUiText>;

export function getCourseEditStructureTabUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CourseEditStructureTabUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
