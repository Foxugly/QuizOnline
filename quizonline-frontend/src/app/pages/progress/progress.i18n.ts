import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import data from './progress.i18n.json';

/**
 * Per-language UI text for the "My progress" page.
 *
 * The page renders a table of every course the caller is enrolled in
 * (status ``active`` or ``completed``) together with a progress bar, a
 * status tag and a "last activity" timestamp. The course title comes
 * from the backend (localized, slug fallback) so no client-side
 * fallback string is needed.
 */
export interface ProgressUiText {
  pageTitle: string;
  colCourse: string;
  colProgress: string;
  colLastActivity: string;
  colStatus: string;
  emptyTitle: string;
  emptyMessage: string;
  exploreButton: string;
}

const CATALOG = data as Record<string, ProgressUiText>;

export function getProgressUiText(
  lang: LanguageEnumDto | string | null | undefined,
): ProgressUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
