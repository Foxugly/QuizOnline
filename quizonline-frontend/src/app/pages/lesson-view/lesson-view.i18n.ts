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
  downloadFileFallback: string;
  videoNotAvailable: string;
  embedNotAvailable: string;
  /** Escape-hatch link surfaced under the embed iframe — used when the
   *  third-party host (YouTube, etc.) refuses to play in an iframe and
   *  the learner needs a way out to the original page. */
  embedOpenInNewTab: string;
  /** Title fallback when the QuizTemplate translation lookup yields no string. */
  quizBlockFallbackTitle: (templateId: number | string) => string;
  /** Pluralized "{n} questions" label for the meta line. */
  quizBlockQuestionsLabel: (n: number) => string;
  /** "{n} min" duration label for the meta line (only shown when with_duration). */
  quizBlockDurationLabel: (n: number) => string;
  /** Mode tag for practice quizzes. */
  quizBlockModePractice: string;
  /** Mode tag for exam quizzes. */
  quizBlockModeExam: string;
  /** CTA: no previous attempt — create a new session. */
  quizBlockStartButton: string;
  /** CTA: an active session exists — resume it. */
  quizBlockResumeButton: string;
  /** CTA: latest session is closed — view its result. */
  quizBlockViewResultButton: string;
  /** Secondary CTA when a closed session exists and a new attempt is still allowed. */
  quizBlockRetakeButton: string;
  /** "Score : {n}%" line for closed sessions. */
  quizBlockScoreLabel: (percent: number) => string;
  /** Notice shown when the user is no longer allowed to attempt the quiz. */
  quizBlockNoAttemptsRemaining: string;
  /** Error state when the template + sessions fetch fails. */
  quizBlockLoadFailed: string;
  /** Retry button paired with the error state. */
  quizBlockRetry: string;
  /** Defensive placeholder when the block has no ``quiz_template`` FK. */
  quizBlockNotConfigured: string;
  lessonCompletedToast: string;
  lessonCompletedErrorToast: string;
  /** Label for the right-side "Edit" button shown only to instructors. */
  editButton: string;
  /** Heading of the left-side block-outline navigation. */
  outlineHeading: string;
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
        downloadFileFallback: 'Télécharger le fichier',
        videoNotAvailable: 'Vidéo indisponible',
        embedNotAvailable: 'Contenu intégré indisponible',
        embedOpenInNewTab: 'Ouvrir dans un nouvel onglet',
        quizBlockFallbackTitle: (id) => `Quiz n° ${id}`,
        quizBlockQuestionsLabel: (n) => `${n} question${n > 1 ? 's' : ''}`,
        quizBlockDurationLabel: (n) => `${n} min`,
        quizBlockModePractice: 'Entraînement',
        quizBlockModeExam: 'Examen',
        quizBlockStartButton: 'Démarrer le quiz',
        quizBlockResumeButton: 'Reprendre',
        quizBlockViewResultButton: 'Voir le résultat',
        quizBlockRetakeButton: 'Recommencer',
        quizBlockScoreLabel: (percent) => `Score : ${percent}%`,
        quizBlockNoAttemptsRemaining: 'Plus de tentatives disponibles',
        quizBlockLoadFailed: 'Impossible de charger le quiz.',
        quizBlockRetry: 'Réessayer',
        quizBlockNotConfigured: 'Quiz non configuré',
        lessonCompletedToast: 'Leçon marquée comme terminée.',
        lessonCompletedErrorToast: 'Impossible de marquer la leçon comme terminée.',
        editButton: 'Modifier',
        outlineHeading: 'Plan de la leçon',
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
        downloadFileFallback: 'Bestand downloaden',
        videoNotAvailable: 'Video niet beschikbaar',
        embedNotAvailable: 'Ingesloten inhoud niet beschikbaar',
        embedOpenInNewTab: 'In nieuw tabblad openen',
        quizBlockFallbackTitle: (id) => `Quiz nr. ${id}`,
        quizBlockQuestionsLabel: (n) => `${n} vra${n > 1 ? 'gen' : 'ag'}`,
        quizBlockDurationLabel: (n) => `${n} min`,
        quizBlockModePractice: 'Oefening',
        quizBlockModeExam: 'Examen',
        quizBlockStartButton: 'Quiz starten',
        quizBlockResumeButton: 'Hervatten',
        quizBlockViewResultButton: 'Resultaat bekijken',
        quizBlockRetakeButton: 'Opnieuw proberen',
        quizBlockScoreLabel: (percent) => `Score: ${percent}%`,
        quizBlockNoAttemptsRemaining: 'Geen pogingen meer beschikbaar',
        quizBlockLoadFailed: 'Kan de quiz niet laden.',
        quizBlockRetry: 'Opnieuw proberen',
        quizBlockNotConfigured: 'Quiz niet geconfigureerd',
        lessonCompletedToast: 'Les gemarkeerd als voltooid.',
        lessonCompletedErrorToast: 'Kon les niet als voltooid markeren.',
        editButton: 'Bewerken',
        outlineHeading: 'Lesoverzicht',
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
        downloadFileFallback: 'Scarica il file',
        videoNotAvailable: 'Video non disponibile',
        embedNotAvailable: 'Contenuto incorporato non disponibile',
        embedOpenInNewTab: 'Apri in una nuova scheda',
        quizBlockFallbackTitle: (id) => `Quiz n° ${id}`,
        quizBlockQuestionsLabel: (n) => `${n} domand${n > 1 ? 'e' : 'a'}`,
        quizBlockDurationLabel: (n) => `${n} min`,
        quizBlockModePractice: 'Allenamento',
        quizBlockModeExam: 'Esame',
        quizBlockStartButton: 'Avvia il quiz',
        quizBlockResumeButton: 'Riprendi',
        quizBlockViewResultButton: 'Vedi il risultato',
        quizBlockRetakeButton: 'Ricomincia',
        quizBlockScoreLabel: (percent) => `Punteggio: ${percent}%`,
        quizBlockNoAttemptsRemaining: 'Nessun tentativo rimanente',
        quizBlockLoadFailed: 'Impossibile caricare il quiz.',
        quizBlockRetry: 'Riprova',
        quizBlockNotConfigured: 'Quiz non configurato',
        lessonCompletedToast: 'Lezione segnata come completata.',
        lessonCompletedErrorToast: 'Impossibile segnare la lezione come completata.',
        editButton: 'Modifica',
        outlineHeading: 'Indice della lezione',
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
        downloadFileFallback: 'Descargar archivo',
        videoNotAvailable: 'Vídeo no disponible',
        embedNotAvailable: 'Contenido incrustado no disponible',
        embedOpenInNewTab: 'Abrir en una nueva pestaña',
        quizBlockFallbackTitle: (id) => `Cuestionario n.º ${id}`,
        quizBlockQuestionsLabel: (n) => `${n} pregunta${n > 1 ? 's' : ''}`,
        quizBlockDurationLabel: (n) => `${n} min`,
        quizBlockModePractice: 'Práctica',
        quizBlockModeExam: 'Examen',
        quizBlockStartButton: 'Iniciar el cuestionario',
        quizBlockResumeButton: 'Reanudar',
        quizBlockViewResultButton: 'Ver el resultado',
        quizBlockRetakeButton: 'Reintentar',
        quizBlockScoreLabel: (percent) => `Puntuación: ${percent}%`,
        quizBlockNoAttemptsRemaining: 'No quedan intentos disponibles',
        quizBlockLoadFailed: 'No se pudo cargar el cuestionario.',
        quizBlockRetry: 'Reintentar',
        quizBlockNotConfigured: 'Cuestionario no configurado',
        lessonCompletedToast: 'Lección marcada como completada.',
        lessonCompletedErrorToast: 'No se pudo marcar la lección como completada.',
        editButton: 'Editar',
        outlineHeading: 'Índice de la lección',
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
        downloadFileFallback: 'Download file',
        videoNotAvailable: 'Video not available',
        embedNotAvailable: 'Embedded content not available',
        embedOpenInNewTab: 'Open in a new tab',
        quizBlockFallbackTitle: (id) => `Quiz #${id}`,
        quizBlockQuestionsLabel: (n) => `${n} question${n > 1 ? 's' : ''}`,
        quizBlockDurationLabel: (n) => `${n} min`,
        quizBlockModePractice: 'Practice',
        quizBlockModeExam: 'Exam',
        quizBlockStartButton: 'Start quiz',
        quizBlockResumeButton: 'Resume quiz',
        quizBlockViewResultButton: 'View result',
        quizBlockRetakeButton: 'Retake',
        quizBlockScoreLabel: (percent) => `Score: ${percent}%`,
        quizBlockNoAttemptsRemaining: 'No attempts remaining',
        quizBlockLoadFailed: 'Could not load the quiz.',
        quizBlockRetry: 'Retry',
        quizBlockNotConfigured: 'Quiz not configured',
        lessonCompletedToast: 'Lesson marked as completed.',
        lessonCompletedErrorToast: 'Could not mark lesson as completed.',
        editButton: 'Edit',
        outlineHeading: 'Lesson outline',
        prevLessonButton: 'Previous lesson',
        nextLessonButton: 'Next lesson',
        positionInSection: (c, t) => `Lesson ${c}/${t}`,
        notesHeading: 'My notes',
        notesPlaceholder: 'Your personal notes on this lesson…',
        notesSavedAt: (time) => `Saved at ${time}`,
      };
  }
}
