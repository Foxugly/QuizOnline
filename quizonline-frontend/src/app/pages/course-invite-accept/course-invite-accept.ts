import {DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {DomSanitizer, type SafeHtml} from '@angular/platform-browser';
import {Subscription} from 'rxjs';

import {ConfirmationService} from 'primeng/api';
import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {TagModule} from 'primeng/tag';

import {CATALOG, COURSE_DETAIL} from '../../app.routes-paths';
import {logApiError} from '../../shared/api/api-errors';
import {LoadingSkeleton} from '../../shared/components/loading-skeleton/loading-skeleton';
import {PageHeader} from '../../shared/components/page-header/page-header';
import {interp} from '../../shared/i18n/format';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {CourseInviteDto, EnrollmentService} from '../../services/enrollment/enrollment.service';
import {InvitationCountService} from '../../services/invitation/invitation-count.service';
import {AppToastService} from '../../shared/toast/app-toast.service';

import {getCourseInviteAcceptUiText} from './course-invite-accept.i18n';

/** Possible end-states the page can render after the initial fetch. */
type ViewState =
  | 'loading'
  | 'pending'       // invite ready to act on (Accept / Decline buttons)
  | 'accepted'
  | 'declined'
  | 'revoked'
  | 'expired'
  | 'not_found'
  | 'forbidden';

/**
 * Public-ish acceptance page reached via the link in the invitation
 * email (``${FRONTEND_BASE_URL}/course-invite/<token>/``).
 *
 * Flow:
 *   1. Token is read from the route param.
 *   2. ``GET /api/course-invite/<token>/`` fetches the row. The
 *      endpoint requires auth + a 403 if the caller is neither the
 *      invitee nor an instructor of the course — those map to the
 *      ``forbidden`` view state.
 *   3. Depending on ``invite.status``:
 *      - ``pending`` → render the Accept / Decline buttons.
 *      - ``accepted`` / ``declined`` / ``revoked`` / ``expired`` →
 *        render a static outcome message + the "back to catalog" CTA.
 *   4. Accept calls the matching POST endpoint and then routes to
 *      ``/course/<slug>`` so the learner lands directly on the
 *      course they just joined.
 */
@Component({
  selector: 'app-course-invite-accept',
  imports: [DatePipe, RouterLink, ButtonModule, CardModule, ConfirmDialogModule, TagModule, PageHeader, LoadingSkeleton],
  providers: [ConfirmationService],
  templateUrl: './course-invite-accept.html',
  styleUrl: './course-invite-accept.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseInviteAccept implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly enrollment = inject(EnrollmentService);
  private readonly invitationCount = inject(InvitationCountService);
  private readonly confirmer = inject(ConfirmationService);
  private readonly toast = inject(AppToastService);
  private readonly uiSvc = inject(UiTextService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly ui = this.uiSvc.localized(getCourseInviteAcceptUiText);
  protected readonly catalogHref = CATALOG;

  protected readonly invite = signal<CourseInviteDto | null>(null);
  protected readonly state = signal<ViewState>('loading');
  protected readonly busy = signal(false);

  protected readonly inviterDisplayName = computed(() => {
    const u = this.invite()?.inviter_detail;
    if (!u) return '';
    const first = (u.first_name ?? '').trim();
    const last = (u.last_name ?? '').trim();
    if (first && last) return `${first} ${last}`;
    return u.name || '';
  });

  protected readonly courseDetailHref = computed(() => {
    const inv = this.invite();
    return inv ? COURSE_DETAIL(inv.course_slug) : CATALOG;
  });

  /** Sanitized HTML for the course description. Backend nh3-sanitizes
   *  rich text on save so the field is XSS-safe before it lands here. */
  protected readonly courseDescription = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.invite()?.course_description ?? ''),
  );

  protected readonly courseLearningObjectives = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.invite()?.course_learning_objectives ?? ''),
  );

  protected readonly hasDescription = computed(
    () => !!(this.invite()?.course_description ?? '').trim(),
  );

  protected readonly hasLearningObjectives = computed(
    () => !!(this.invite()?.course_learning_objectives ?? '').trim(),
  );

  /** "{inviter} invited you to {course}" banner. */
  protected invitationFrom(inviter: string, course: string): string {
    return interp(this.ui().invitationFrom, {inviter, course});
  }

  /** "This invitation expires on {when}" hint. */
  protected expiresAtLabel(when: string): string {
    return interp(this.ui().expiresAt, {when});
  }

  /** Estimated-duration meta label, e.g. "45 min". */
  protected durationLabel(minutes: number): string {
    return interp(this.ui().durationLabel, {minutes});
  }

  protected levelLabel(level: string): string {
    const choices = this.ui().levelChoices;
    if (level === 'beginner') return choices.beginner;
    if (level === 'intermediate') return choices.intermediate;
    if (level === 'advanced') return choices.advanced;
    return level;
  }

  private routeSub: Subscription | null = null;

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const token = params.get('token');
      if (!token) {
        this.state.set('not_found');
        return;
      }
      this.load(token);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.routeSub = null;
    if (this.autoRedirectTimer !== null) {
      window.clearTimeout(this.autoRedirectTimer);
      this.autoRedirectTimer = null;
    }
  }

  protected accept(): void {
    const inv = this.invite();
    if (!inv || this.busy() || this.state() !== 'pending') {
      return;
    }
    this.busy.set(true);
    this.enrollment.acceptInviteByToken(inv.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.busy.set(false);
        this.state.set('accepted');
        this.invitationCount.refresh();
        this.toast.add({severity: 'success', summary: this.ui().acceptSuccessToast});
        // Auto-redirect to the course detail after a short delay so
        // the learner does not have to manually click "Go to course"
        // — they wanted in, they're in, send them there. Two
        // seconds is long enough to read the "Invitation acceptée"
        // confirmation card without feeling stuck.
        this.scheduleAutoRedirect();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        logApiError('lms.course-invite-accept.accept', err);
        this.toast.addApiError(err, this.ui().acceptErrorToast);
      },
    });
  }

  /** Two-second timeout to the course detail after a successful
   *  accept. Stored on the instance so ``ngOnDestroy`` can clear it
   *  if the user navigates away in the meantime. */
  private autoRedirectTimer: number | null = null;

  private scheduleAutoRedirect(): void {
    if (this.autoRedirectTimer !== null) {
      window.clearTimeout(this.autoRedirectTimer);
    }
    this.autoRedirectTimer = window.setTimeout(() => {
      this.autoRedirectTimer = null;
      this.goToCourse();
    }, 2000);
  }

  protected confirmDecline(): void {
    const inv = this.invite();
    if (!inv || this.busy() || this.state() !== 'pending') {
      return;
    }
    const t = this.ui();
    this.confirmer.confirm({
      header: t.declineConfirmHeader,
      message: interp(t.declineConfirmMessage, {courseTitle: inv.course_title}),
      icon: 'pi pi-times-circle',
      acceptLabel: t.declineConfirmAccept,
      rejectLabel: t.declineConfirmReject,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.decline(),
    });
  }

  private decline(): void {
    const inv = this.invite();
    if (!inv) {
      return;
    }
    this.busy.set(true);
    this.enrollment.declineInviteByToken(inv.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.busy.set(false);
        this.state.set('declined');
        this.invitationCount.refresh();
        this.toast.add({severity: 'success', summary: this.ui().declineSuccessToast});
      },
      error: (err: unknown) => {
        this.busy.set(false);
        logApiError('lms.course-invite-accept.decline', err);
        this.toast.addApiError(err, this.ui().declineErrorToast);
      },
    });
  }

  private load(token: string): void {
    this.state.set('loading');
    this.enrollment.getInviteByToken(token).subscribe({
      next: (invite) => {
        this.invite.set(invite);
        this.state.set(this.resolveState(invite));
      },
      error: (err: unknown) => {
        const status = (err as HttpErrorResponse)?.status;
        if (status === 404) {
          this.state.set('not_found');
        } else if (status === 403) {
          this.state.set('forbidden');
        } else {
          logApiError('lms.course-invite-accept.load', err);
          this.state.set('not_found');
        }
      },
    });
  }

  private resolveState(invite: CourseInviteDto): ViewState {
    switch (invite.status) {
      case 'pending':
        return 'pending';
      case 'accepted':
        return 'accepted';
      case 'declined':
        return 'declined';
      case 'revoked':
        return 'revoked';
      case 'expired':
        return 'expired';
      default:
        return 'not_found';
    }
  }

  protected goToCourse(): void {
    const inv = this.invite();
    if (!inv) return;
    void this.router.navigateByUrl(COURSE_DETAIL(inv.course_slug));
  }
}
