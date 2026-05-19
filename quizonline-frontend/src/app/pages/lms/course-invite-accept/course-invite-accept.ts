import {DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {Subscription} from 'rxjs';

import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';

import {LMS_CATALOG, LMS_COURSE_DETAIL} from '../../../app.routes-paths';
import {logApiError} from '../../../shared/api/api-errors';
import {PageHeader} from '../../../shared/components/page-header/page-header';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {CourseInviteDto, LmsEnrollmentService} from '../../../services/lms/lms-enrollment.service';
import {AppToastService} from '../../../shared/toast/app-toast.service';

import {getLmsCourseInviteAcceptUiText} from './course-invite-accept.i18n';

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
 * email (``${FRONTEND_BASE_URL}/lms/course-invite/<token>/``).
 *
 * Flow:
 *   1. Token is read from the route param.
 *   2. ``GET /api/lms/course-invite/<token>/`` fetches the row. The
 *      endpoint requires auth + a 403 if the caller is neither the
 *      invitee nor an instructor of the course — those map to the
 *      ``forbidden`` view state.
 *   3. Depending on ``invite.status``:
 *      - ``pending`` → render the Accept / Decline buttons.
 *      - ``accepted`` / ``declined`` / ``revoked`` / ``expired`` →
 *        render a static outcome message + the "back to catalog" CTA.
 *   4. Accept calls the matching POST endpoint and then routes to
 *      ``/lms/course/<slug>`` so the learner lands directly on the
 *      course they just joined.
 */
@Component({
  selector: 'app-lms-course-invite-accept',
  imports: [DatePipe, RouterLink, ButtonModule, CardModule, PageHeader],
  templateUrl: './course-invite-accept.html',
  styleUrl: './course-invite-accept.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCourseInviteAccept implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly enrollment = inject(LmsEnrollmentService);
  private readonly toast = inject(AppToastService);
  private readonly uiSvc = inject(UiTextService);

  protected readonly ui = this.uiSvc.localized(getLmsCourseInviteAcceptUiText);
  protected readonly catalogHref = LMS_CATALOG;

  protected readonly invite = signal<CourseInviteDto | null>(null);
  protected readonly state = signal<ViewState>('loading');
  protected readonly busy = signal(false);

  protected readonly inviterDisplayName = computed(() => {
    const u = this.invite()?.inviter_detail;
    if (!u) return '';
    const first = (u.first_name ?? '').trim();
    const last = (u.last_name ?? '').trim();
    if (first && last) return `${first} ${last}`;
    return u.username || '';
  });

  protected readonly courseDetailHref = computed(() => {
    const inv = this.invite();
    return inv ? LMS_COURSE_DETAIL(inv.course_slug) : LMS_CATALOG;
  });

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
  }

  protected accept(): void {
    const inv = this.invite();
    if (!inv || this.busy() || this.state() !== 'pending') {
      return;
    }
    this.busy.set(true);
    this.enrollment.acceptInviteByToken(inv.token).subscribe({
      next: () => {
        this.busy.set(false);
        this.state.set('accepted');
        this.toast.add({severity: 'success', summary: this.ui().acceptSuccessToast});
      },
      error: (err: unknown) => {
        this.busy.set(false);
        logApiError('lms.course-invite-accept.accept', err);
        this.toast.addApiError(err, this.ui().acceptErrorToast);
      },
    });
  }

  protected decline(): void {
    const inv = this.invite();
    if (!inv || this.busy() || this.state() !== 'pending') {
      return;
    }
    this.busy.set(true);
    this.enrollment.declineInviteByToken(inv.token).subscribe({
      next: () => {
        this.busy.set(false);
        this.state.set('declined');
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
    void this.router.navigateByUrl(LMS_COURSE_DETAIL(inv.course_slug));
  }
}
