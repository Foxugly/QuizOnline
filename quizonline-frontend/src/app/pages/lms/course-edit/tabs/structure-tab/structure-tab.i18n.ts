import {LanguageEnumDto} from '../../../../../api/generated/model/language-enum';

/**
 * Per-tab dictionary for the "Structure" tab where sections + lessons
 * will eventually be reordered via drag-and-drop. MVP is just a
 * heading + placeholder; the full tree editor is deferred.
 */
export interface LmsCourseEditStructureTabUiText {
  heading: string;
  placeholder: (courseId: number) => string;
}

export function getLmsCourseEditStructureTabUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCourseEditStructureTabUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        heading: 'Structure',
        placeholder: (id) => `Sections et leçons du cours n° ${id} — arbre éditable à venir.`,
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        heading: 'Structuur',
        placeholder: (id) => `Secties en lessen van cursus nr. ${id} — bewerkbare boom volgt.`,
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        heading: 'Struttura',
        placeholder: (id) => `Sezioni e lezioni del corso n° ${id} — albero modificabile in arrivo.`,
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        heading: 'Estructura',
        placeholder: (id) => `Secciones y lecciones del curso n.º ${id} — árbol editable próximamente.`,
      };
    default:
      return {
        heading: 'Structure',
        placeholder: (id) => `Sections and lessons for course #${id} — editable tree coming soon.`,
      };
  }
}
