import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

/**
 * Per-page i18n strings for the learner lesson-view page and its eight
 * block-renderer components. The ``quizBlockPlaceholder`` is a builder
 * (not a static string) so that callers can substitute the quiz
 * template id without exposing untranslated tokens — every visible
 * string still flows through this file in all five supported
 * languages.
 */
export interface LmsLessonViewUiText {
  pageTitle: string;
  pageLoading: string;
  markCompletedButton: string;
  alreadyCompletedBadge: string;
  downloadFileFallback: string;
  videoNotAvailable: string;
  embedNotAvailable: string;
  quizBlockPlaceholder: (templateId: number | string) => string;
  lessonCompletedToast: string;
  lessonCompletedErrorToast: string;
}

export function getLmsLessonViewUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsLessonViewUiText {
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
        quizBlockPlaceholder: (id) => `Quiz n° ${id} — intégration prévue dans une prochaine itération.`,
        lessonCompletedToast: 'Leçon marquée comme terminée.',
        lessonCompletedErrorToast: 'Impossible de marquer la leçon comme terminée.',
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
        quizBlockPlaceholder: (id) => `Quiz nr. ${id} — integratie volgt in een latere iteratie.`,
        lessonCompletedToast: 'Les gemarkeerd als voltooid.',
        lessonCompletedErrorToast: 'Kon les niet als voltooid markeren.',
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
        quizBlockPlaceholder: (id) => `Quiz n° ${id} — integrazione prevista in una prossima iterazione.`,
        lessonCompletedToast: 'Lezione segnata come completata.',
        lessonCompletedErrorToast: 'Impossibile segnare la lezione come completata.',
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
        quizBlockPlaceholder: (id) => `Cuestionario n.º ${id} — integración prevista en una próxima iteración.`,
        lessonCompletedToast: 'Lección marcada como completada.',
        lessonCompletedErrorToast: 'No se pudo marcar la lección como completada.',
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
        quizBlockPlaceholder: (id) => `Quiz #${id} — runner integration pending a later iteration.`,
        lessonCompletedToast: 'Lesson marked as completed.',
        lessonCompletedErrorToast: 'Could not mark lesson as completed.',
      };
  }
}
