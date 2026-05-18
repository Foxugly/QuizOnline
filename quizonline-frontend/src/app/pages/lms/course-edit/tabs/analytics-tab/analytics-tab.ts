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

import {CourseDetailDto} from '../../../../../api/generated/model/course-detail';
import {CourseEnrollmentDto} from '../../../../../api/generated/model/course-enrollment';
import {CourseEnrollmentStatusEnumDto} from '../../../../../api/generated/model/course-enrollment-status-enum';

import {LmsEnrollmentService} from '../../../../../services/lms/lms-enrollment.service';
import {logApiError} from '../../../../../shared/api/api-errors';
import {EmptyStateComponent} from '../../../../../shared/components/empty-state/empty-state';
import {UiTextService} from '../../../../../shared/i18n/ui-text.service';
import {RelativeDatePipe} from '../../../../../shared/pipes/relative-date.pipe';

import {getLmsCourseEditAnalyticsTabUiText} from './analytics-tab.i18n';

/** Snapshot of the KPIs surfaced on the Analytics tab. Stored as a single
 *  computed signal so re-render is one CD pass even when the underlying
 *  enrollment list runs into the low hundreds. */
interface CourseAnalyticsSnapshot {
  total: number;
  active: number;
  pending: number;
  completed: number;
  cancelled: number;
  /** Completion-rate denominator excludes pending + cancelled so the
   *  KPI reflects "how many of the people who actually engaged with
   *  the course made it to the end" rather than gross conversion. */
  completionRatePct: number;
  /** ``null`` when the course has no enrollments. */
  lastEnrolledAt: string | null;
  /** ``null`` when no enrollment has reached ``completed`` yet. */
  lastCompletedAt: string | null;
}

/**
 * "Analytics" tab of ``/lms/course/:id/edit``: client-side aggregation
 * of the existing ``/api/lms/enrollment/?course=<id>`` list endpoint.
 *
 * Rationale for client-side aggregation rather than a dedicated
 * analytics endpoint: per-course enrollment volume is expected to stay
 * in the low hundreds (we already paginate-then-unwrap the same data
 * on the Enrollment tab one tab over), and the KPI panel is read in
 * isolation by course authors — there is no concurrent-user scaling
 * pressure on this view. Trading a backend round-trip for a tiny bit
 * of frontend math keeps the surface area minimal until / unless we
 * grow per-course volumes that demand a server-side rollup.
 *
 * Visual layout intentionally mirrors :class:`DomainAnalyticsTab`
 * (``analytics-counters`` grid + ``analytics-card`` wrapper) so the
 * KPI look-and-feel stays consistent across the app.
 */
@Component({
  selector: 'app-lms-course-edit-analytics-tab',
  imports: [ButtonModule, SkeletonModule, DatePipe, RelativeDatePipe, EmptyStateComponent],
  templateUrl: './analytics-tab.html',
  styleUrl: './analytics-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCourseEditAnalyticsTab {
  private readonly enrollmentService = inject(LmsEnrollmentService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly ui = inject(UiTextService).localized(getLmsCourseEditAnalyticsTabUiText);

  courseId = input.required<number>();
  /** Parent course detail — drives the conditional ``pending`` KPI tile
   *  (only shown when the course uses approval-gated enrollment). */
  course = input<CourseDetailDto | null>(null);

  protected readonly loading = signal<boolean>(false);
  protected readonly error = signal<boolean>(false);
  protected readonly enrollments = signal<CourseEnrollmentDto[]>([]);

  /** Whether the parent course gates enrollments behind moderator
   *  approval — the ``pending`` KPI is only meaningful in that mode
   *  (open / invite modes auto-activate so pending always reads 0). */
  protected readonly showPendingKpi = computed(
    () => this.course()?.enrollment_mode === 'approval',
  );

  protected readonly hasData = computed(() => this.enrollments().length > 0);

  /** Single aggregation pass over the enrollment list. Kept as one
   *  computed (rather than a KPI-per-computed) so each KPI snapshot is
   *  internally consistent — there is no window where ``total`` has
   *  ticked up but ``active`` has not yet been recomputed. */
  protected readonly snapshot = computed<CourseAnalyticsSnapshot>(() => {
    const rows = this.enrollments();
    let active = 0;
    let pending = 0;
    let completed = 0;
    let cancelled = 0;
    let lastEnrolledAt: string | null = null;
    let lastCompletedAt: string | null = null;
    for (const row of rows) {
      switch (row.status) {
        case CourseEnrollmentStatusEnumDto.Active:
          active += 1;
          break;
        case CourseEnrollmentStatusEnumDto.Pending:
          pending += 1;
          break;
        case CourseEnrollmentStatusEnumDto.Completed:
          completed += 1;
          break;
        case CourseEnrollmentStatusEnumDto.Cancelled:
          cancelled += 1;
          break;
      }
      if (row.enrolled_at && (!lastEnrolledAt || row.enrolled_at > lastEnrolledAt)) {
        lastEnrolledAt = row.enrolled_at;
      }
      if (row.completed_at && (!lastCompletedAt || row.completed_at > lastCompletedAt)) {
        lastCompletedAt = row.completed_at;
      }
    }
    const denom = active + completed;
    const completionRatePct = denom > 0 ? Math.round((completed / denom) * 100) : 0;
    return {
      total: rows.length,
      active,
      pending,
      completed,
      cancelled,
      completionRatePct,
      lastEnrolledAt,
      lastCompletedAt,
    };
  });

  /** Pre-computed "X% of total" hint shown under the ``completed`` /
   *  ``active`` tiles. Returns an empty string when ``total === 0`` so
   *  the tile stays clean instead of rendering "0% of total". */
  protected readonly completedHint = computed(() => {
    const s = this.snapshot();
    if (s.total === 0) {
      return '';
    }
    return this.ui().kpiHints.pctOfTotal(Math.round((s.completed / s.total) * 100));
  });

  protected readonly activeHint = computed(() => {
    const s = this.snapshot();
    if (s.total === 0) {
      return '';
    }
    return this.ui().kpiHints.pctOfTotal(Math.round((s.active / s.total) * 100));
  });

  constructor() {
    // Fetch whenever the route resolves a different course id. Effects
    // are the right tool here rather than ngOnChanges — ``courseId`` is
    // a signal-input and changes both on first mount and on subsequent
    // route param changes (the shell reuses this component instance).
    effect(() => {
      const id = this.courseId();
      if (id > 0) {
        this.load(id);
      } else {
        this.enrollments.set([]);
        this.error.set(false);
      }
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
      .listForCourse(courseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.enrollments.set(rows ?? []);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          logApiError('lms.course-edit.analytics.load', err);
          this.enrollments.set([]);
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }
}
