import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {ProgressBarModule} from 'primeng/progressbar';
import {SkeletonModule} from 'primeng/skeleton';

import {LMS_CATALOG, LMS_ME_CERTIFICATES, LMS_ME_PROGRESS, ROUTES} from '../../app.routes-paths';
import {LmsEnrollmentService} from '../../services/lms/lms-enrollment.service';
import {logApiError} from '../../shared/api/api-errors';
import {PageHeader} from '../../shared/components/page-header/page-header';
import {UiTextService} from '../../shared/i18n/ui-text.service';

import {getDashboardUiText} from './dashboard.i18n';

/** Shape rendered from ``GET /api/lms/progress/``. The serializer is
 *  the canonical ``CourseProgressSerializer`` with ``course_title``
 *  filled server-side — see the LMS progress page for the same type. */
interface ProgressRow {
  id: number;
  course: number;
  course_title: string;
  progress_percent: number;
  updated_at: string;
}

/** Shape rendered from ``GET /api/lms/certificate/``. Only the count
 *  is consumed here — the certificates tile is a counter + CTA. */
interface CertificateRow {
  id: number;
}

/**
 * Unified post-login dashboard. Four tiles aggregate the learner's
 * LMS + quiz state in one place so the user can jump back into work
 * without hunting through the topmenu:
 *
 * - **Courses in progress**: top 3 active enrollments with progress bars.
 * - **My certificates**: count + CTA to the list.
 * - **My quizzes**: shortcut to the quiz session table.
 * - **Catalog**: CTA to browse courses.
 *
 * Each tile is best-effort: a 401/empty list collapses to its
 * "no items yet" hint and the skeleton placeholder during fetch keeps
 * the layout stable.
 */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, ButtonModule, ProgressBarModule, SkeletonModule, PageHeader],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
  private readonly enrollment = inject(LmsEnrollmentService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly ui = inject(UiTextService).localized(getDashboardUiText);

  protected readonly catalogHref = LMS_CATALOG;
  protected readonly progressHref = LMS_ME_PROGRESS;
  protected readonly certificatesHref = LMS_ME_CERTIFICATES;
  protected readonly quizListHref = ROUTES.quiz.list();

  protected readonly coursesLoading = signal(true);
  protected readonly courses = signal<ProgressRow[]>([]);
  protected readonly certificatesLoading = signal(true);
  protected readonly certificates = signal<CertificateRow[]>([]);

  /** Top 3 courses by recent activity, ranked by ``updated_at`` desc. */
  protected readonly topCourses = computed(() =>
    [...this.courses()]
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
      .slice(0, 3),
  );

  protected readonly certificatesCount = computed(() => this.certificates().length);

  ngOnInit(): void {
    this.loadCourses();
    this.loadCertificates();
  }

  private loadCourses(): void {
    this.coursesLoading.set(true);
    this.enrollment.myProgress()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: unknown) => {
          const payload = response as {results?: ProgressRow[]} | ProgressRow[] | null;
          const rows = Array.isArray(payload) ? payload : (payload?.results ?? []);
          this.courses.set(rows);
          this.coursesLoading.set(false);
        },
        error: (err: unknown) => {
          logApiError('dashboard.courses', err);
          this.courses.set([]);
          this.coursesLoading.set(false);
        },
      });
  }

  private loadCertificates(): void {
    this.certificatesLoading.set(true);
    this.enrollment.myCertificates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: unknown) => {
          const payload = response as {results?: CertificateRow[]} | CertificateRow[] | null;
          const rows = Array.isArray(payload) ? payload : (payload?.results ?? []);
          this.certificates.set(rows);
          this.certificatesLoading.set(false);
        },
        error: (err: unknown) => {
          logApiError('dashboard.certificates', err);
          this.certificates.set([]);
          this.certificatesLoading.set(false);
        },
      });
  }
}
