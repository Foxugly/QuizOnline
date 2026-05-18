import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

/**
 * Shell-level labels for the course-edit page. Only the page title and
 * the four top-level tab labels live here; each tab owns its own
 * heading / placeholder dictionary so this getter stays narrow and the
 * full course-author experience can grow tab-by-tab without churning
 * the shell.
 */
export interface LmsCourseEditUiText {
  pageTitle: string;
  tabInfo: string;
  tabStructure: string;
  tabEnrollment: string;
  tabAnalytics: string;
}

export function getLmsCourseEditUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCourseEditUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        pageTitle: 'Édition du cours',
        tabInfo: 'Informations',
        tabStructure: 'Structure',
        tabEnrollment: 'Inscriptions',
        tabAnalytics: 'Analyses',
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Cursus bewerken',
        tabInfo: 'Informatie',
        tabStructure: 'Structuur',
        tabEnrollment: 'Inschrijvingen',
        tabAnalytics: 'Analyses',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'Modifica corso',
        tabInfo: 'Informazioni',
        tabStructure: 'Struttura',
        tabEnrollment: 'Iscrizioni',
        tabAnalytics: 'Analisi',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Editar curso',
        tabInfo: 'Información',
        tabStructure: 'Estructura',
        tabEnrollment: 'Inscripciones',
        tabAnalytics: 'Analíticas',
      };
    default:
      return {
        pageTitle: 'Edit course',
        tabInfo: 'Information',
        tabStructure: 'Structure',
        tabEnrollment: 'Enrollment',
        tabAnalytics: 'Analytics',
      };
  }
}
