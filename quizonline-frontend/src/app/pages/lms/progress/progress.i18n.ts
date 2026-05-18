import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

/**
 * Per-language UI text for the "My progress" page.
 *
 * The page renders a table of every course the caller is enrolled in
 * (status ``active`` or ``completed``) together with a progress bar, a
 * status tag and a "last activity" timestamp. ``courseFallback`` is used
 * when the backend payload does not embed the localized course title —
 * see ``CourseProgressSerializer`` which only carries the FK id today
 * (a follow-up could SerializerMethodField the localized title).
 */
export interface LmsProgressUiText {
  pageTitle: string;
  colCourse: string;
  colProgress: string;
  colLastActivity: string;
  colStatus: string;
  emptyTitle: string;
  emptyMessage: string;
  exploreButton: string;
  courseFallback: (id: number) => string;
}

export function getLmsProgressUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsProgressUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        pageTitle: 'Ma progression',
        colCourse: 'Cours',
        colProgress: 'Progression',
        colLastActivity: 'Dernière activité',
        colStatus: 'Statut',
        emptyTitle: 'Aucun cours suivi',
        emptyMessage: 'Inscrivez-vous à un cours depuis le catalogue pour démarrer.',
        exploreButton: 'Parcourir le catalogue',
        courseFallback: (id) => `Cours n° ${id}`,
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Mijn voortgang',
        colCourse: 'Cursus',
        colProgress: 'Voortgang',
        colLastActivity: 'Laatste activiteit',
        colStatus: 'Status',
        emptyTitle: 'Geen cursus in uitvoering',
        emptyMessage: 'Schrijf je in voor een cursus vanuit de catalogus om te beginnen.',
        exploreButton: 'Door catalogus bladeren',
        courseFallback: (id) => `Cursus nr. ${id}`,
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'I miei progressi',
        colCourse: 'Corso',
        colProgress: 'Progresso',
        colLastActivity: 'Ultima attività',
        colStatus: 'Stato',
        emptyTitle: 'Nessun corso in corso',
        emptyMessage: 'Iscriviti a un corso dal catalogo per iniziare.',
        exploreButton: 'Sfoglia il catalogo',
        courseFallback: (id) => `Corso n. ${id}`,
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Mi progreso',
        colCourse: 'Curso',
        colProgress: 'Progreso',
        colLastActivity: 'Última actividad',
        colStatus: 'Estado',
        emptyTitle: 'Sin cursos en curso',
        emptyMessage: 'Inscríbete en un curso desde el catálogo para empezar.',
        exploreButton: 'Explorar catálogo',
        courseFallback: (id) => `Curso n.º ${id}`,
      };
    default:
      return {
        pageTitle: 'My progress',
        colCourse: 'Course',
        colProgress: 'Progress',
        colLastActivity: 'Last activity',
        colStatus: 'Status',
        emptyTitle: 'No course in progress',
        emptyMessage: 'Enroll in a course from the catalog to get started.',
        exploreButton: 'Browse catalog',
        courseFallback: (id) => `Course #${id}`,
      };
  }
}
