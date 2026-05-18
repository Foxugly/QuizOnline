import {LanguageEnumDto} from '../../../../../api/generated/model/language-enum';

/**
 * Per-tab dictionary for the "Analytics" tab. Will eventually render
 * the course-level KPIs already exposed by the backend (active /
 * completed enrollments, median time-to-complete, etc.); MVP keeps a
 * placeholder so the tab order is final and i18n is exhaustive.
 */
export interface LmsCourseEditAnalyticsTabUiText {
  heading: string;
  placeholder: (courseId: number) => string;
}

export function getLmsCourseEditAnalyticsTabUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCourseEditAnalyticsTabUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        heading: 'Analyses',
        placeholder: (id) => `Indicateurs du cours n° ${id} — tableau de bord à venir.`,
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        heading: 'Analyses',
        placeholder: (id) => `Indicatoren van cursus nr. ${id} — dashboard volgt.`,
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        heading: 'Analisi',
        placeholder: (id) => `Indicatori del corso n° ${id} — dashboard in arrivo.`,
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        heading: 'Analíticas',
        placeholder: (id) => `Indicadores del curso n.º ${id} — panel próximamente.`,
      };
    default:
      return {
        heading: 'Analytics',
        placeholder: (id) => `Indicators for course #${id} — dashboard coming soon.`,
      };
  }
}
