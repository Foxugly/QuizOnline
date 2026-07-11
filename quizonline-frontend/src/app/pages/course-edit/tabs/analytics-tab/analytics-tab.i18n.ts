import {LanguageEnumDto} from '../../../../api/generated/model/language-enum';
import {AuditActionLabels} from './analytics-audit-action.util';
import data from './analytics-tab.i18n.json';

/**
 * Per-tab dictionary for the course-edit "Analytics" tab. KPIs are
 * aggregated client-side from the enrollment list endpoint (see
 * :class:`CourseEditAnalyticsTab`); this dictionary owns every
 * visible string surfaced by that panel — labels, hints, error /
 * empty states.
 *
 * Five languages (FR/EN/NL/IT/ES) are mandatory; the i18n
 * completeness check (``scripts/check-i18n.ts``) fails the build
 * otherwise.
 */
export interface CourseEditAnalyticsTabUiText {
  heading: string;
  subtitle: string;
  kpi: {
    total: string;
    active: string;
    pending: string;
    completed: string;
    cancelled: string;
    completionRate: string;
    lastEnrollment: string;
    lastCompletion: string;
    medianProgress: string;
    certificatesIssued: string;
  };
  trendHeading: string;
  trendSubtitle: string;
  invite: {
    heading: string;
    subtitle: string;
    kpi: {
      total: string;
      pending: string;
      accepted: string;
      declined: string;
      revoked: string;
      expired: string;
      acceptanceRate: string;
      medianDecisionHours: string;
    };
    /** INTERP: ``{hours}`` — render through ``interp``. */
    decisionHoursValue: string;
  };
  auditHeading: string;
  auditEmpty: string;
  /** LOGIC — localized action labels keyed by the free-form back-end
   *  action code (``course.publish`` / ``course.unpublish`` /
   *  ``course.clone``). Resolve via ``auditActionLabel`` with a
   *  fallback to the raw code for any action not listed here. */
  auditAction: AuditActionLabels;
  kpiHints: {
    /** INTERP: ``{pct}`` — render through ``interp``. */
    pctOfTotal: string;
    neverYet: string;
  };
  errors: {
    loadFailed: string;
  };
  retryButton: string;
  emptyTitle: string;
  emptyMessage: string;
}

const CATALOG = data as Record<string, CourseEditAnalyticsTabUiText>;

export function getCourseEditAnalyticsTabUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CourseEditAnalyticsTabUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
