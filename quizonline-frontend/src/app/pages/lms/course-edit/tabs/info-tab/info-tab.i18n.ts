import {LanguageEnumDto} from '../../../../../api/generated/model/language-enum';

/**
 * Per-tab dictionary for the course-edit "Information" tab. The full
 * editable form (title, slug, level, description, cover image, etc.)
 * is deferred to a later iteration; the MVP just shows a localized
 * heading + placeholder paragraph so the shell is fully usable.
 */
export interface LmsCourseEditInfoTabUiText {
  heading: string;
  placeholder: (courseId: number) => string;
}

export function getLmsCourseEditInfoTabUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCourseEditInfoTabUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        heading: 'Informations',
        placeholder: (id) => `Édition du cours n° ${id} — formulaire complet à venir.`,
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        heading: 'Informatie',
        placeholder: (id) => `Cursus nr. ${id} bewerken — volledig formulier volgt.`,
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        heading: 'Informazioni',
        placeholder: (id) => `Modifica del corso n° ${id} — modulo completo in arrivo.`,
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        heading: 'Información',
        placeholder: (id) => `Editar el curso n.º ${id} — formulario completo próximamente.`,
      };
    default:
      return {
        heading: 'Information',
        placeholder: (id) => `Editing course #${id} — full form coming soon.`,
      };
  }
}
