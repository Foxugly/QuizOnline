import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

/**
 * Per-language UI text for the "My progress" page.
 *
 * The page renders a table of every course the caller is enrolled in
 * (status ``active`` or ``completed``) together with a progress bar, a
 * status tag and a "last activity" timestamp. The course title comes
 * from the backend (localized, slug fallback) so no client-side
 * fallback string is needed.
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
      };
  }
}
