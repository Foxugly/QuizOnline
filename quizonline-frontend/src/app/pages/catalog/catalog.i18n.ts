import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {PluralForms} from '../../shared/i18n/format';
import {CatalogDurationCopy} from './catalog-duration.util';
import data from './catalog.i18n.json';

export interface CatalogUiText {
  pageTitle: string;
  filterByLevelLabel: string;
  filterByLanguageLabel: string;
  filterByDomainLabel: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyMessage: string;
  enrollmentBadge: Record<'open' | 'approval' | 'invite', string>;
  viewButton: string;
  createCourseButton: string;
  /** Top-right CTA on the catalog header that routes instructors to
   *  the admin ``/course/list`` table view. Visible only when the
   *  caller manages at least one domain. */
  listButton: string;
  /** PLURAL — card meta lesson count, e.g. "12 lessons". Render through ``plural``. */
  lessonCount: PluralForms;
  /** LOGIC — total-duration copy templates, formatted via
   *  ``formatCatalogDuration`` into "Xh Ym" or "Y min". */
  duration: CatalogDurationCopy;
  /** Badge surfaced on the card when the caller is already enrolled. */
  enrolledBadge: string;
  /** Continue-learning CTA label shown instead of "View" once enrolled. */
  continueButton: string;
  /** Per-card publish-status badge — surfaced only for cards the caller
   *  can manage, so plain learners never see them. Same vocabulary as
   *  :type:`CourseListUiText.statusLabels` so the two instructor
   *  surfaces stay consistent. */
  statusLabels: {
    published: string;
    draft: string;
  };
}

const CATALOG = data as Record<string, CatalogUiText>;

export function getCatalogUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CatalogUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
