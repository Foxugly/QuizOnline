import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {ProgressBarModule} from 'primeng/progressbar';
import {SkeletonModule} from 'primeng/skeleton';

import {LMS_CATALOG, LMS_COURSE_INVITE_ACCEPT, LMS_ME_CERTIFICATES, LMS_ME_INVITATIONS, LMS_ME_PROGRESS, ROUTES} from '../../app.routes-paths';
import {DomainReadDto} from '../../api/generated/model/domain-read';
import {DomainService} from '../../services/domain/domain';
import {CourseInviteDto, LmsEnrollmentService} from '../../services/lms/lms-enrollment.service';
import {UserService} from '../../services/user/user';
import {logApiError} from '../../shared/api/api-errors';
import {PageHeader} from '../../shared/components/page-header/page-header';
import {UiTextService} from '../../shared/i18n/ui-text.service';

import {getDashboardUiText} from './dashboard.i18n';

/** Shape rendered from ``GET /api/progress/``. The serializer is
 *  the canonical ``CourseProgressSerializer`` with ``course_title``
 *  filled server-side — see the LMS progress page for the same type. */
interface ProgressRow {
  id: number;
  course: number;
  course_title: string;
  progress_percent: number;
  updated_at: string;
}

/** Shape rendered from ``GET /api/certificate/``. Only the count
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
  private readonly domainService = inject(DomainService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly ui = inject(UiTextService).localized(getDashboardUiText);

  protected readonly catalogHref = LMS_CATALOG;
  protected readonly progressHref = LMS_ME_PROGRESS;
  protected readonly certificatesHref = LMS_ME_CERTIFICATES;
  protected readonly invitationsHref = LMS_ME_INVITATIONS;
  protected readonly quizListHref = ROUTES.quiz.list();

  protected readonly coursesLoading = signal(true);
  protected readonly courses = signal<ProgressRow[]>([]);
  protected readonly certificatesLoading = signal(true);
  protected readonly certificates = signal<CertificateRow[]>([]);
  protected readonly invitationsLoading = signal(true);
  protected readonly invitations = signal<CourseInviteDto[]>([]);
  /** Domains the user belongs to in any capacity. Used to decide
   *  whether the caller is an instructor anywhere — which keeps the
   *  invitations tile visible even when empty so the affordance stays
   *  discoverable for users who manage invite-only courses. */
  private readonly domains = signal<DomainReadDto[]>([]);

  /** Top 3 pending invitations for the tile body, sorted by most
   *  recently sent so the freshest one shows first. */
  protected readonly topInvitations = computed(() =>
    [...this.invitations()]
      .sort((a, b) => (a.last_sent_at < b.last_sent_at ? 1 : -1))
      .slice(0, 3),
  );

  /** True when the caller owns or manages at least one domain
   *  (superusers count too). Pulled from the domains list rather
   *  than ``currentUser()`` because the user model does not carry
   *  the owned/managed domain set inline. */
  private readonly isInstructorAnywhere = computed(() => {
    const me = this.userService.currentUser();
    if (!me) {
      return false;
    }
    if (me.is_superuser) {
      return true;
    }
    return this.domains().some(
      (d) => d.owner?.id === me.id || (d.managers ?? []).some((u) => u.id === me.id),
    );
  });

  /** Visibility gate for the "Pending invitations" tile.
   *
   *  Renders while still loading (skeletons keep the layout stable),
   *  whenever there is at least one invitation to act on, and for
   *  instructors so the discoverability of the feature is preserved.
   *  Hidden for a plain learner who has no invitation — those users
   *  would otherwise see a permanently-empty tile that adds nothing. */
  protected readonly showInvitationsTile = computed(() =>
    this.invitationsLoading()
    || this.invitations().length > 0
    || this.isInstructorAnywhere(),
  );

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
    this.loadInvitations();
    this.loadDomains();
  }

  private loadDomains(): void {
    this.domainService.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (domains) => this.domains.set(domains ?? []),
        error: (err: unknown) => {
          logApiError('dashboard.domains', err);
          this.domains.set([]);
        },
      });
  }

  protected inviteHref(token: string): string {
    return LMS_COURSE_INVITE_ACCEPT(token);
  }

  private loadInvitations(): void {
    this.invitationsLoading.set(true);
    this.enrollment.myInvitations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.invitations.set(rows);
          this.invitationsLoading.set(false);
        },
        error: (err: unknown) => {
          logApiError('dashboard.invitations', err);
          this.invitations.set([]);
          this.invitationsLoading.set(false);
        },
      });
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
