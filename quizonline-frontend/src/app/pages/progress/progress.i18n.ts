import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {pageUiText} from '../../shared/i18n/catalog-registry';

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

export function getProgressUiText(
  lang: LanguageEnumDto | string | null | undefined,
): ProgressUiText {
  return pageUiText<ProgressUiText>('progress', lang);
}
