import {LanguageEnumDto} from '../../api/generated/model/language-enum';

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
  /** "Lesson {current}/{total}" header subtitle prefix. */
  positionInSection: (current: number, total: number) => string;
  /** Heading of the private notes section. */
  notesHeading: string;
  /** Placeholder shown in the empty notes textarea. */
  notesPlaceholder: string;
  /** Status hint: "Saved at HH:MM" right after a successful PUT. */
  notesSavedAt: (time: string) => string;
}

export function getLessonViewUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LessonViewUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        pageTitle: 'Leçon',
        pageLoading: 'Chargement de la leçon…',
        markCompletedButton: 'Marquer comme terminée',
        alreadyCompletedBadge: 'Terminée',
        lessonCompletedToast: 'Leçon marquée comme terminée.',
        lessonCompletedErrorToast: 'Impossible de marquer la leçon comme terminée.',
        editButton: 'Modifier',
        prevLessonButton: 'Leçon précédente',
        nextLessonButton: 'Leçon suivante',
        positionInSection: (c, t) => `Leçon ${c}/${t}`,
        notesHeading: 'Mes notes',
        notesPlaceholder: 'Vos notes personnelles sur cette leçon…',
        notesSavedAt: (time) => `Enregistré à ${time}`,
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Les',
        pageLoading: 'Les laden…',
        markCompletedButton: 'Markeer als voltooid',
        alreadyCompletedBadge: 'Voltooid',
        lessonCompletedToast: 'Les gemarkeerd als voltooid.',
        lessonCompletedErrorToast: 'Kon les niet als voltooid markeren.',
        editButton: 'Bewerken',
        prevLessonButton: 'Vorige les',
        nextLessonButton: 'Volgende les',
        positionInSection: (c, t) => `Les ${c}/${t}`,
        notesHeading: 'Mijn notities',
        notesPlaceholder: 'Je persoonlijke notities over deze les…',
        notesSavedAt: (time) => `Opgeslagen om ${time}`,
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'Lezione',
        pageLoading: 'Caricamento lezione…',
        markCompletedButton: 'Segna come completata',
        alreadyCompletedBadge: 'Completata',
        lessonCompletedToast: 'Lezione segnata come completata.',
        lessonCompletedErrorToast: 'Impossibile segnare la lezione come completata.',
        editButton: 'Modifica',
        prevLessonButton: 'Lezione precedente',
        nextLessonButton: 'Lezione successiva',
        positionInSection: (c, t) => `Lezione ${c}/${t}`,
        notesHeading: 'I miei appunti',
        notesPlaceholder: 'I tuoi appunti personali su questa lezione…',
        notesSavedAt: (time) => `Salvato alle ${time}`,
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Lección',
        pageLoading: 'Cargando lección…',
        markCompletedButton: 'Marcar como completada',
        alreadyCompletedBadge: 'Completada',
        lessonCompletedToast: 'Lección marcada como completada.',
        lessonCompletedErrorToast: 'No se pudo marcar la lección como completada.',
        editButton: 'Editar',
        prevLessonButton: 'Lección anterior',
        nextLessonButton: 'Lección siguiente',
        positionInSection: (c, t) => `Lección ${c}/${t}`,
        notesHeading: 'Mis notas',
        notesPlaceholder: 'Tus notas personales sobre esta lección…',
        notesSavedAt: (time) => `Guardado a las ${time}`,
      };
    default:
      return {
        pageTitle: 'Lesson',
        pageLoading: 'Loading lesson…',
        markCompletedButton: 'Mark as completed',
        alreadyCompletedBadge: 'Completed',
        lessonCompletedToast: 'Lesson marked as completed.',
        lessonCompletedErrorToast: 'Could not mark lesson as completed.',
        editButton: 'Edit',
        prevLessonButton: 'Previous lesson',
        nextLessonButton: 'Next lesson',
        positionInSection: (c, t) => `Lesson ${c}/${t}`,
        notesHeading: 'My notes',
        notesPlaceholder: 'Your personal notes on this lesson…',
        notesSavedAt: (time) => `Saved at ${time}`,
      };
  }
}
