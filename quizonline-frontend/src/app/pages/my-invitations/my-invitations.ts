import {DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';

import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {TabsModule} from 'primeng/tabs';
import {TagModule} from 'primeng/tag';

import {COURSE_INVITE_ACCEPT, COURSE_DETAIL} from '../../app.routes-paths';
import {CourseInviteStatusEnumDto} from '../../api/generated/model/course-invite-status-enum';
import {logApiError} from '../../shared/api/api-errors';
import {interp} from '../../shared/i18n/format';
import {EmptyStateComponent} from '../../shared/components/empty-state/empty-state';
import {PageHeader} from '../../shared/components/page-header/page-header';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {CourseInviteDto, EnrollmentService} from '../../services/enrollment/enrollment.service';
import {AppToastService} from '../../shared/toast/app-toast.service';

import {getMyInvitationsUiText} from './my-invitations.i18n';

/** PrimeNG tag severities reused for invitation statuses. */
type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

/**
 * Learner-side hub at ``/me/invitations``.
 *
 * Two tabs:
 *
 * - **Pending** (default): every pending invitation. Each card links
 *   to the dedicated acceptance page so the learner can accept /
 *   decline with full context.
 * - **History**: every non-pending invitation (accepted / declined /
 *   revoked / expired) so the learner can retrieve a course they
 *   joined via invitation OR check why they no longer see a course
 *   they used to be invited to.
 *
 * A learner who follows an email link lands directly on
 * ``/course-invite/<token>``; this page covers the alternate
 * flow where the learner dismissed the email but still wants to
 * find their open invitations.
 */
@Component({
  selector: 'app-my-invitations',
  imports: [
    DatePipe, RouterLink,
    ButtonModule, CardModule, TabsModule, TagModule,
    EmptyStateComponent, PageHeader,
  ],
  templateUrl: './my-invitations.html',
  styleUrl: './my-invitations.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyInvitations implements OnInit {
  private readonly enrollment = inject(EnrollmentService);
  private readonly toast = inject(AppToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly ui = inject(UiTextService).localized(getMyInvitationsUiText);

  protected readonly invitations = signal<CourseInviteDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly activeTab = signal<'pending' | 'history'>('pending');

  protected readonly pendingInvitations = computed(() =>
    this.invitations().filter((i) => i.status === CourseInviteStatusEnumDto.Pending),
  );
  protected readonly historyInvitations = computed(() =>
    this.invitations().filter((i) => i.status !== CourseInviteStatusEnumDto.Pending),
  );

  ngOnInit(): void {
    this.refresh();
  }

  /** Interpolated "Invited by {inviter}" meta line. */
  protected invitationFrom(inviter: string): string {
    return interp(this.ui().invitationFrom, {inviter});
  }

  /** Interpolated "Expires on {when}" meta line. */
  protected expiresAt(when: string): string {
    return interp(this.ui().expiresAt, {when});
  }

  /** Interpolated "On {when}" history meta line. */
  protected historyDateLabel(when: string): string {
    return interp(this.ui().historyDateLabel, {when});
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
    return COURSE_INVITE_ACCEPT(token);
  }

  /** History rows for accepted invitations link straight to the
   *  course detail (the learner is enrolled now). Other terminal
   *  statuses stay on the read-only card. */
  protected courseHrefFor(slug: string): string {
    return COURSE_DETAIL(slug);
  }

  protected statusLabel(status: CourseInviteDto['status']): string {
    const labels = this.ui().statusLabels;
    if (status === CourseInviteStatusEnumDto.Pending) return labels.pending;
    if (status === CourseInviteStatusEnumDto.Accepted) return labels.accepted;
    if (status === CourseInviteStatusEnumDto.Declined) return labels.declined;
    if (status === CourseInviteStatusEnumDto.Revoked) return labels.revoked;
    return labels.expired;
  }

  protected statusSeverity(status: CourseInviteDto['status']): TagSeverity {
    if (status === CourseInviteStatusEnumDto.Accepted) return 'success';
    if (status === CourseInviteStatusEnumDto.Pending) return 'warn';
    return 'secondary';
  }

  private refresh(): void {
    this.loading.set(true);
    // ``status=all`` to fetch both pending + history in one round-trip;
    // the template tabs filter the in-memory list per tab.
    this.enrollment
      .myInvitations({status: 'all'})
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
