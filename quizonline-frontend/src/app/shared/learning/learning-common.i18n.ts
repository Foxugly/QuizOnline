import {LanguageEnumDto} from '../../api/generated/model/language-enum';

/** Content-block type discriminator shared by every LMS lesson block. */
export type BlockType =
  | 'rich_text' | 'image' | 'video' | 'file'
  | 'quiz' | 'callout' | 'code' | 'embed';

/** Lifecycle of a user's enrollment in a course. */
export type EnrollmentStatus = 'pending' | 'active' | 'completed' | 'cancelled';

/** Difficulty taxonomy advertised on a course. */
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

/** Source backing a video block. */
export type VideoProvider = 'youtube' | 'vimeo' | 'upload';

/**
 * Bundle of label dictionaries needed across every LMS surface that
 * renders one of the enums above. Page-specific i18n files compose this
 * via :func:`getLearningCommonUiText` rather than duplicating per-page.
 */
export interface LearningCommonUiText {
  blockTypeLabels: Record<BlockType, string>;
  enrollmentStatusLabels: Record<EnrollmentStatus, string>;
  levelLabels: Record<CourseLevel, string>;
  videoProviderLabels: Record<VideoProvider, string>;
}

/**
 * Return the shared LMS enum label dictionary for ``lang``. Accepts the
 * same wide ``LanguageEnumDto | string | null | undefined`` shape as
 * every other ``getXxxUiText`` getter so it slots directly into
 * :func:`UiTextService.localized`; unknown values fall back to English.
 */
export function getLearningCommonUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LearningCommonUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        blockTypeLabels: {
          rich_text: 'Texte enrichi', image: 'Image', video: 'Vidéo', file: 'Fichier',
          quiz: 'Quiz', callout: 'Encadré', code: 'Code', embed: 'iframe',
        },
        enrollmentStatusLabels: {
          pending: 'En attente', active: 'Actif', completed: 'Terminé', cancelled: 'Annulé',
        },
        levelLabels: {beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé'},
        videoProviderLabels: {youtube: 'YouTube', vimeo: 'Vimeo', upload: 'Hébergé localement'},
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        blockTypeLabels: {
          rich_text: 'Opgemaakte tekst', image: 'Afbeelding', video: 'Video', file: 'Bestand',
          quiz: 'Quiz', callout: 'Aandachtsblok', code: 'Code', embed: 'iframe',
        },
        enrollmentStatusLabels: {
          pending: 'In afwachting', active: 'Actief', completed: 'Voltooid', cancelled: 'Geannuleerd',
        },
        levelLabels: {beginner: 'Beginner', intermediate: 'Gevorderd', advanced: 'Geavanceerd'},
        videoProviderLabels: {youtube: 'YouTube', vimeo: 'Vimeo', upload: 'Lokaal gehost'},
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        blockTypeLabels: {
          rich_text: 'Testo formattato', image: 'Immagine', video: 'Video', file: 'File',
          quiz: 'Quiz', callout: 'Riquadro', code: 'Codice', embed: 'iframe',
        },
        enrollmentStatusLabels: {
          pending: 'In attesa', active: 'Attivo', completed: 'Completato', cancelled: 'Annullato',
        },
        levelLabels: {beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzato'},
        videoProviderLabels: {youtube: 'YouTube', vimeo: 'Vimeo', upload: 'Self-hosted'},
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        blockTypeLabels: {
          rich_text: 'Texto enriquecido', image: 'Imagen', video: 'Vídeo', file: 'Archivo',
          quiz: 'Cuestionario', callout: 'Recuadro', code: 'Código', embed: 'iframe',
        },
        enrollmentStatusLabels: {
          pending: 'Pendiente', active: 'Activo', completed: 'Completado', cancelled: 'Cancelado',
        },
        levelLabels: {beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado'},
        videoProviderLabels: {youtube: 'YouTube', vimeo: 'Vimeo', upload: 'Alojado localmente'},
      };
    default:
      return {
        blockTypeLabels: {
          rich_text: 'Rich text', image: 'Image', video: 'Video', file: 'File',
          quiz: 'Quiz', callout: 'Callout', code: 'Code', embed: 'iframe',
        },
        enrollmentStatusLabels: {
          pending: 'Pending', active: 'Active', completed: 'Completed', cancelled: 'Cancelled',
        },
        levelLabels: {beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced'},
        videoProviderLabels: {youtube: 'YouTube', vimeo: 'Vimeo', upload: 'Self-hosted'},
      };
  }
}
