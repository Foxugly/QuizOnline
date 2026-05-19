import {DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';

import {LMS_COURSE_INVITE_ACCEPT} from '../../../app.routes-paths';
import {logApiError} from '../../../shared/api/api-errors';
import {EmptyStateComponent} from '../../../shared/components/empty-state/empty-state';
import {PageHeader} from '../../../shared/components/page-header/page-header';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {CourseInviteDto, LmsEnrollmentService} from '../../../services/lms/lms-enrollment.service';
import {AppToastService} from '../../../shared/toast/app-toast.service';

import {getLmsMyInvitationsUiText} from './my-invitations.i18n';

/**
 * Learner-side hub at ``/lms/me/invitations`` listing every pending
 * course invitation the calling user has received. Each row is a
 * card with the inviter, the expiry date, and a deep-link to the
 * dedicated acceptance page so the learner can accept / decline
 * with all the context (description, objectives, duration).
 *
 * A learner who follows an email link lands directly on
 * ``/lms/course-invite/<token>``; this page covers the alternate
 * flow where the learner dismissed the email but still wants to
 * find their open invitations.
 */
@Component({
  selector: 'app-lms-my-invitations',
  imports: [DatePipe, RouterLink, ButtonModule, CardModule, EmptyStateComponent, PageHeader],
  templateUrl: './my-invitations.html',
  styleUrl: './my-invitations.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsMyInvitations implements OnInit {
  private readonly enrollment = inject(LmsEnrollmentService);
  private readonly toast = inject(AppToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly ui = inject(UiTextService).localized(getLmsMyInvitationsUiText);

  protected readonly invitations = signal<CourseInviteDto[]>([]);
  protected readonly loading = signal(false);

  ngOnInit(): void {
    this.refresh();
  }

  protected inviterDisplayName(inv: CourseInviteDto): string {
    const u = inv.inviter_detail;
    if (!u) return '';
    const first = (u.first_name ?? '').trim();
    const last = (u.last_name ?? '').trim();
    if (first && last) return `${first} ${last}`;
    return u.username || '';
  }

  protected hrefFor(token: string): string {
    return LMS_COURSE_INVITE_ACCEPT(token);
  }

  private refresh(): void {
    this.loading.set(true);
    this.enrollment
      .myInvitations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.invitations.set(rows);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          logApiError('lms.my-invitations.load', err);
          this.toast.addApiError(err, this.ui().loadErrorToast);
          this.loading.set(false);
        },
      });
  }
}
