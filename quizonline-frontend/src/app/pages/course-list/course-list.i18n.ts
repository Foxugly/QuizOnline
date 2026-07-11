import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {PluralForms} from '../../shared/i18n/format';
import data from './course-list.i18n.json';

/**
 * Page-scoped labels for the instructor course-list view at
 * ``/course/list``. Mirrors the schema used by the other admin
 * ``/list`` pages (subject-list, question-list, …) so the same
 * ``BulkActionsComponent`` and ``<app-page-header>``-less ``header-line``
 * pattern can be reused without per-page tweaks.
 */
export interface CourseListUiText {
  title: string;
  searchPlaceholder: string;
  bulk: {
    placeholder: string;
    apply: string;
    /** PLURAL on the selection count — render through ``plural``. */
    selectedCount: PluralForms;
    publish: string;
    unpublish: string;
    delete: string;
    confirmDeleteHeader: string;
    /** PLURAL on the course count — render through ``plural``. */
    confirmDeleteMessage: PluralForms;
    confirmDeleteAccept: string;
    confirmDeleteCancel: string;
  };
  columns: {
    title: string;
    domain: string;
    level: string;
    enrollment: string;
    status: string;
    lessons: string;
    actions: string;
  };
  enrollmentBadge: Record<'open' | 'approval' | 'invite', string>;
  emptyMessage: string;
  catalogButton: string;
  /** PLURAL on the course count — render through ``plural``. */
  publishSuccessToast: PluralForms;
  /** PLURAL on the course count — render through ``plural``. */
  unpublishSuccessToast: PluralForms;
  /** PLURAL on the course count — render through ``plural``. */
  deleteSuccessToast: PluralForms;
  bulkErrorToast: string;
}

const CATALOG = data as Record<string, CourseListUiText>;

export function getCourseListUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CourseListUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.Fr];
}
