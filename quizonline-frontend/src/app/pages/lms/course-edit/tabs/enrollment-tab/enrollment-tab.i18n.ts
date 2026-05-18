import {LanguageEnumDto} from '../../../../../api/generated/model/language-enum';

/**
 * Per-tab dictionary for the "Enrollment" tab. Will eventually surface
 * the pending-request queue + approve / reject controls served from
 * the enrollment endpoints; MVP is a localized placeholder.
 */
export interface LmsCourseEditEnrollmentTabUiText {
  heading: string;
  placeholder: (courseId: number) => string;
}

export function getLmsCourseEditEnrollmentTabUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCourseEditEnrollmentTabUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        heading: 'Inscriptions',
        placeholder: (id) => `Gestion des inscriptions au cours n° ${id} — file d'approbation à venir.`,
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        heading: 'Inschrijvingen',
        placeholder: (id) => `Beheer van inschrijvingen voor cursus nr. ${id} — goedkeuringswachtrij volgt.`,
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        heading: 'Iscrizioni',
        placeholder: (id) => `Gestione delle iscrizioni al corso n° ${id} — coda di approvazione in arrivo.`,
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        heading: 'Inscripciones',
        placeholder: (id) => `Gestión de inscripciones del curso n.º ${id} — cola de aprobación próximamente.`,
      };
    default:
      return {
        heading: 'Enrollment',
        placeholder: (id) => `Enrollment management for course #${id} — approval queue coming soon.`,
      };
  }
}
