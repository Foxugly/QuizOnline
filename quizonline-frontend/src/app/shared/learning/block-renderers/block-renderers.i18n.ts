import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

/**
 * Shared label dictionary for every block-renderer under
 * ``shared/learning/block-renderers/``. Every visible string emitted
 * by the file / image / video / embed / quiz renderers (fallback
 * labels, CTAs, error / loading hints, score line, mode tags) lives
 * here so the renderers can stay under ``shared/`` without depending
 * on the ``pages/lesson-view`` page-scoped i18n.
 *
 * The quiz block renderer is a launcher card (the actual quiz player
 * lives at ``/quiz/:id/questions``). It surfaces four CTA states
 * (start / resume / view result / retake), a meta line
 * (questions / duration / mode), the loading + error affordances,
 * and the localised score / fallback strings.
 */
export interface BlockRenderersUiText {
  /** Generic "open file" link label rendered next to a file block when
   *  its translated ``title`` is empty. */
  downloadFileFallback: string;
  /** Placeholder shown when the video block has no recognisable
   *  provider or URL. */
  videoNotAvailable: string;
  /** Placeholder shown when the embed block has no URL or the URL
   *  fails to render. */
  embedNotAvailable: string;
  /** Escape-hatch link surfaced under embed iframes — used when the
   *  third-party host refuses to play in an iframe and the learner
   *  needs a way out to the original page. */
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
}

export function getBlockRenderersUiText(
  lang: LanguageEnumDto | string | null | undefined,
): BlockRenderersUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
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
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
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
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
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
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
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
      };
    default:
      return {
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
      };
  }
}
