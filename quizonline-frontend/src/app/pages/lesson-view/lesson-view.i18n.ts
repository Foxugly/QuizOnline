import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import data from './lesson-view.i18n.json';

/**
 * Per-page i18n strings for the learner lesson-view page and its eight
 * block-renderer components.
 *
 * The quiz block renderer is a launcher card (not the actual quiz player —
 * the player lives at ``/quiz/:id/questions``). It calls into this dict
 * for the four CTA states (start / resume / view result / retake), the
 * meta line (questions / duration / mode), the loading and error
 * affordances, and the localized score / fallback strings — every
 * visible string still flows through this file in all five supported
 * languages.
 */
export interface LessonViewUiText {
  pageTitle: string;
  pageLoading: string;
  markCompletedButton: string;
  alreadyCompletedBadge: string;
  lessonCompletedToast: string;
  lessonCompletedErrorToast: string;
  /** Label for the right-side "Edit" button shown only to instructors. */
  editButton: string;
  /** Footer button: previous lesson. */
  prevLessonButton: string;
  /** Footer button: next lesson. */
  nextLessonButton: string;
  /** INTERP — "Lesson {current}/{total}" header subtitle prefix; render via ``interp``. */
  positionInSection: string;
  /** Heading of the private notes section. */
  notesHeading: string;
  /** Placeholder shown in the empty notes textarea. */
  notesPlaceholder: string;
  /** INTERP — "Saved at {time}" status hint after a successful PUT; render via ``interp``. */
  notesSavedAt: string;
}

const CATALOG = data as Record<string, LessonViewUiText>;

export function getLessonViewUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LessonViewUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
