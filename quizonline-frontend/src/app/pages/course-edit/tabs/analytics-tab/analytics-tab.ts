import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {DatePipe} from '@angular/common';
import {ButtonModule} from 'primeng/button';
import {SkeletonModule} from 'primeng/skeleton';

import {CourseDetailDto} from '../../../../api/generated/model/course-detail';

import {CourseAnalyticsDto, EnrollmentService} from '../../../../services/enrollment/enrollment.service';
import {CourseAuditEntryDto, CatalogService} from '../../../../services/catalog/catalog.service';
import {logApiError} from '../../../../shared/api/api-errors';
import {EmptyStateComponent} from '../../../../shared/components/empty-state/empty-state';
import {interp} from '../../../../shared/i18n/format';
import {UiTextService} from '../../../../shared/i18n/ui-text.service';
import {RelativeDatePipe} from '../../../../shared/pipes/relative-date.pipe';

import {getCourseEditAnalyticsTabUiText} from './analytics-tab.i18n';
import {auditActionLabel} from './analytics-audit-action.util';

/** Row shape consumed by the inline sparkline. Pre-computed in a
 *  ``computed`` so each tooltip + bar height is plain template data. */
interface TrendBarVm {
  date: string;
  count: number;
  heightPct: number;
}

/**
 * "Analytics" tab of ``/course/:id/edit``. Calls the server-side
 * ``/api/course/{id}/analytics/`` endpoint so the frontend never
 * aggregates: it just renders the pre-computed KPIs + a small 30-day
 * enrollment-trend bar chart.
 *
 * Visual layout intentionally mirrors :class:`DomainAnalyticsTab` for
 * cross-page consistency. The ``pending`` tile is only surfaced when
 * the parent course uses approval-gated enrollment.
 */
@Component({
  selector: 'app-course-edit-analytics-tab',
  imports: [ButtonModule, SkeletonModule, DatePipe, RelativeDatePipe, EmptyStateComponent],
  templateUrl: './analytics-tab.html',
  styleUrl: './analytics-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseEditAnalyticsTab {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly catalogService = inject(CatalogService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly ui = inject(UiTextService).localized(getCourseEditAnalyticsTabUiText);

  courseId = input.required<number>();
  /** Parent course detail — drives the conditional ``pending`` KPI tile
   *  (only shown when the course uses approval-gated enrollment). */
  course = input<CourseDetailDto | null>(null);

  protected readonly loading = signal<boolean>(false);
  protected readonly error = signal<boolean>(false);
  protected readonly analytics = signal<CourseAnalyticsDto | null>(null);
  /** Append-only audit trail loaded alongside the KPIs. Empty list is
   *  rendered as a "no activity yet" hint — never blocks the panel. */
  protected readonly auditEntries = signal<CourseAuditEntryDto[]>([]);

  /** Whether the parent course gates enrollments behind moderator
   *  approval — the ``pending`` KPI is only meaningful in that mode
   *  (open / invite modes auto-activate so pending always reads 0). */
  protected readonly showPendingKpi = computed(
    () => this.course()?.enrollment_mode === 'approval',
  );

  /** Whether to render the invite-side KPI block. We surface it on
   *  any course that has at least one invitation row regardless of
   *  the current mode — an instructor who flips a course back to
   *  ``open`` after sending invitations should still see what
   *  happened. */
  protected readonly showInviteSection = computed(
    () => (this.analytics()?.invite_counts.total ?? 0) > 0,
  );

  protected readonly inviteCounts = computed(() => this.analytics()?.invite_counts ?? null);

  protected readonly hasData = computed(() => (this.analytics()?.enrollment_counts.total ?? 0) > 0);

  protected readonly counts = computed(() => this.analytics()?.enrollment_counts ?? null);

  /** Pre-computed "X% of total" hint shown under the ``completed`` /
   *  ``active`` tiles. Returns an empty string when ``total === 0``. */
  protected readonly completedHint = computed(() => {
    const counts = this.counts();
    if (!counts || counts.total === 0) {
      return '';
    }
    return interp(this.ui().kpiHints.pctOfTotal, {
      pct: Math.round((counts.completed / counts.total) * 100),
    });
  });

  protected readonly activeHint = computed(() => {
    const counts = this.counts();
    if (!counts || counts.total === 0) {
      return '';
    }
    return interp(this.ui().kpiHints.pctOfTotal, {
      pct: Math.round((counts.active / counts.total) * 100),
    });
  });

  /** Median invite-decision time label, e.g. "6 h". */
  protected decisionHoursValue(hours: number): string {
    return interp(this.ui().invite.decisionHoursValue, {hours});
  }

  /** Localized audit-action label, falling back to the raw code. */
  protected auditAction(rawAction: string): string {
    return auditActionLabel(rawAction, this.ui().auditAction);
  }

  /** Normalize the 30-day trend into bars with a relative height. Each
   *  bar's height is its count divided by the window's peak so the
   *  tallest bar always fills the chart. */
  protected readonly trendBars = computed<TrendBarVm[]>(() => {
    const trend = this.analytics()?.enrollment_trend_30d ?? [];
    if (trend.length === 0) {
      return [];
    }
    const peak = trend.reduce((m, b) => (b.count > m ? b.count : m), 0);
    return trend.map((b) => ({
      date: b.date,
      count: b.count,
      heightPct: peak > 0 ? Math.round((b.count / peak) * 100) : 0,
    }));
  });

  protected readonly trendHasAny = computed(() =>
    this.trendBars().some((b) => b.count > 0),
  );

  constructor() {
    // Fetch whenever the route resolves a different course id. Effects
    // are the right tool here rather than ngOnChanges — ``courseId`` is
    // a signal-input and changes both on first mount and on subsequent
    // route param changes (the shell reuses this component instance).
    effect(() => {
      const id = this.courseId();
      if (id > 0) {
        this.load(id);
        this.loadAudit(id);
      } else {
        this.analytics.set(null);
        this.auditEntries.set([]);
        this.error.set(false);
      }
    });
  }

  private loadAudit(courseId: number): void {
    this.catalogService.courseAuditLog(courseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => this.auditEntries.set(rows ?? []),
        error: (err: unknown) => {
          logApiError('lms.course-edit.audit-log.load', err);
          this.auditEntries.set([]);
        },
      });
  }

  protected retry(): void {
    const id = this.courseId();
    if (id > 0) {
      this.load(id);
    }
  }

  private load(courseId: number): void {
    this.loading.set(true);
    this.error.set(false);
    this.enrollmentService
      .courseAnalytics(courseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (payload) => {
          this.analytics.set(payload);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          logApiError('lms.course-edit.analytics.load', err);
          this.analytics.set(null);
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }
}
