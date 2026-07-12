import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {PluralForms} from '../../shared/i18n/format';
import data from './dashboard.i18n.json';

/**
 * UI strings for the unified post-login dashboard. The page surfaces
 * counts pulled from the LMS enrollment / certificate / quiz session
 * endpoints, so every tile carries:
 * - a title (eg. "Courses in progress"),
 * - an empty-state hint when the user has zero items,
 * - a primary CTA leading to the matching list page.
 */
export interface DashboardUiText {
  pageTitle: string;
  pageSubtitle: string;
  tiles: {
    courses: {
      title: string;
      empty: string;
      cta: string;
      /** INTERP: ``{pct}`` — render through ``interp``. */
      progressLabel: string;
    };
    certificates: {
      title: string;
      empty: string;
      /** PLURAL on the certificate count — render through ``plural``. */
      count: PluralForms;
      cta: string;
    };
    quizzes: {
      title: string;
      empty: string;
      cta: string;
    };
    catalog: {
      title: string;
      subtitle: string;
      cta: string;
    };
    invitations: {
      title: string;
      empty: string;
      cta: string;
      /** INTERP: ``{inviter}`` — render through ``interp``. */
      inviterLine: string;
    };
  };
}

const CATALOG = data as Record<string, DashboardUiText>;

export function getDashboardUiText(
  lang: LanguageEnumDto | string | null | undefined,
): DashboardUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
