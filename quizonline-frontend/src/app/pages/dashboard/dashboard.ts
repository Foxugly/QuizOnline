import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {ProgressBarModule} from 'primeng/progressbar';
import {SkeletonModule} from 'primeng/skeleton';

import {
  CATALOG, COURSE_EDIT, COURSE_INVITE_ACCEPT, COURSE_LIST, COURSE_NEW, ME_CERTIFICATES, ME_INVITATIONS, ME_PROGRESS, ROUTES,
} from '../../app.routes-paths';
import {DomainReadDto} from '../../api/generated/model/domain-read';
import {CatalogService} from '../../services/catalog/catalog.service';
import {DomainService} from '../../services/domain/domain';
import {CourseInviteDto, EnrollmentService} from '../../services/enrollment/enrollment.service';
import {UserService} from '../../services/user/user';
import {logApiError} from '../../shared/api/api-errors';
import {EmptyStateComponent} from '../../shared/components/empty-state/empty-state';
import {PageHeader} from '../../shared/components/page-header/page-header';
import {StatusBadgeComponent} from '../../shared/components/status-badge/status-badge';
import {interp, plural} from '../../shared/i18n/format';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {pickTranslation, type TranslationsMap} from '../../shared/learning/learning-translations';

import {getDashboardUiText} from './dashboard.i18n';

/** Shape rendered from ``GET /api/v1/progress/``. The serializer is
 *  the canonical ``CourseProgressSerializer`` with ``course_title``
 *  filled server-side — see the LMS progress page for the same type. */
interface ProgressRow {
  id: number;
  course: number;
  course_title: string;
  progress_percent: number;
  updated_at: string;
}

/** Shape rendered from ``GET /api/v1/certificate/``. Only the count
 *  is consumed here — the certificates tile is a counter + CTA. */
interface CertificateRow {
  id: number;
}

/** Subset of ``GET /api/v1/course/?manageable_only=1`` rows the
 *  instructor "drafts" tile consumes. */
interface ManageableCourseRow {
  id: number;
  is_published: boolean;
  translations?: TranslationsMap;
}

/** Max number of draft courses listed in the instructor tile. */
const MAX_DRAFTS = 5;

/**
 * Unified post-login dashboard. Four tiles aggregate the learner's
 * LMS + quiz state in one place so the user can jump back into work
 * without hunting through the topmenu:
 *
 * - **Courses in progress**: top 3 active enrollments with progress bars.
 * - **My certificates**: count + CTA to the list.
 * - **My quizzes**: shortcut to the quiz session table.
 * - **Catalog**: CTA to browse courses.
 * - **My draft courses** (instructors only): up to 5 unpublished
 *   manageable courses linking to the course editor Content tab.
 *
 * Each tile is best-effort: a 401/empty list collapses to its
 * "no items yet" hint and the skeleton placeholder during fetch keeps
 * the layout stable.
 */
@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink, ButtonModule, ProgressBarModule, SkeletonModule, PageHeader, StatusBadgeComponent, EmptyStateComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
  private readonly enrollment = inject(EnrollmentService);
  private readonly domainService = inject(DomainService);
  private readonly catalog = inject(CatalogService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly uiSvc = inject(UiTextService);
  protected readonly ui = this.uiSvc.localized(getDashboardUiText);
  /** Shell vocabulary for ``<app-status-badge>`` labels. */
  protected readonly shellUi = this.uiSvc.ui;

  protected readonly catalogHref = CATALOG;
  protected readonly progressHref = ME_PROGRESS;
  protected readonly certificatesHref = ME_CERTIFICATES;
  protected readonly invitationsHref = ME_INVITATIONS;
  protected readonly quizListHref = ROUTES.quiz.list();
  protected readonly courseListHref = COURSE_LIST;
  protected readonly courseNewHref = COURSE_NEW;
  /** ``COURSE_EDIT_TAB(id, 'content')`` split for ``routerLink`` + ``queryParams``. */
  protected readonly contentTabParams = {tab: 'content'} as const;

  protected readonly coursesLoading = signal(true);
  protected readonly courses = signal<ProgressRow[]>([]);
  protected readonly certificatesLoading = signal(true);
  protected readonly certificates = signal<CertificateRow[]>([]);
  protected readonly invitationsLoading = signal(true);
  protected readonly invitations = signal<CourseInviteDto[]>([]);
  protected readonly draftsLoading = signal(true);
  private readonly manageableCourses = signal<ManageableCourseRow[]>([]);
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
  protected readonly isInstructorAnywhere = computed(() => {
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

  /** Up to 5 unpublished manageable courses, in the API order (on
   *  PostgreSQL ``published_at`` desc puts the never-published ones first). */
  protected readonly draftCourses = computed(() => {
    const lang = this.userService.lang();
    return this.manageableCourses()
      .filter((c) => !c.is_published)
      .slice(0, MAX_DRAFTS)
      .map((c) => ({
        id: c.id,
        title: pickTranslation(c.translations, lang, 'title') || `#${c.id}`,
        editPath: COURSE_EDIT(c.id),
      }));
  });

  /** Per-course progress label, e.g. "80%". */
  protected progressLabel(pct: number): string {
    return interp(this.ui().tiles.courses.progressLabel, {pct});
  }

  /** Pluralized certificate-count hint, e.g. "3 certificates". */
  protected certificatesCountLabel(n: number): string {
    return plural(this.ui().tiles.certificates.count, n);
  }

  /** "Invited by X" hint on a pending-invitation row. */
  protected inviterLine(inviter: string): string {
    return interp(this.ui().tiles.invitations.inviterLine, {inviter});
  }

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
        next: (domains) => {
          this.domains.set(domains ?? []);
          if (this.isInstructorAnywhere()) {
            this.loadDraftCourses();
          }
        },
        error: (err: unknown) => {
          logApiError('dashboard.domains', err);
          this.domains.set([]);
        },
      });
  }

  private loadDraftCourses(): void {
    this.draftsLoading.set(true);
    this.catalog.list({manageableOnly: true})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.manageableCourses.set((response?.results ?? []) as ManageableCourseRow[]);
          this.draftsLoading.set(false);
        },
        error: (err: unknown) => {
          logApiError('dashboard.drafts', err);
          this.manageableCourses.set([]);
          this.draftsLoading.set(false);
        },
      });
  }

  protected inviteHref(token: string): string {
    return COURSE_INVITE_ACCEPT(token);
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
