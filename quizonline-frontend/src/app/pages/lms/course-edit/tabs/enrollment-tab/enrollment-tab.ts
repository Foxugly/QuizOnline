import {DatePipe} from '@angular/common';
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
import {FormsModule} from '@angular/forms';

import {ConfirmationService} from 'primeng/api';
import {AutoCompleteModule} from 'primeng/autocomplete';
import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {SelectModule} from 'primeng/select';
import {TableModule} from 'primeng/table';
import {TagModule} from 'primeng/tag';

import {CourseEnrollmentDto} from '../../../../../api/generated/model/course-enrollment';
import {CourseEnrollmentStatusEnumDto} from '../../../../../api/generated/model/course-enrollment-status-enum';
import {CourseDetailDto} from '../../../../../api/generated/model/course-detail';
import {EnrollmentModeEnumDto} from '../../../../../api/generated/model/enrollment-mode-enum';
import {UserSummaryDto} from '../../../../../api/generated/model/user-summary';

import {DomainService} from '../../../../../services/domain/domain';
import {CourseInviteDto, LmsEnrollmentService} from '../../../../../services/lms/lms-enrollment.service';
import {logApiError} from '../../../../../shared/api/api-errors';
import {EmptyStateComponent} from '../../../../../shared/components/empty-state/empty-state';
import {UiTextService} from '../../../../../shared/i18n/ui-text.service';
import {getLmsCommonUiText} from '../../../../../shared/lms/lms-common.i18n';
import {RelativeDatePipe} from '../../../../../shared/pipes/relative-date.pipe';
import {AppToastService} from '../../../../../shared/toast/app-toast.service';

import {getLmsCourseEditEnrollmentTabUiText} from './enrollment-tab.i18n';

/** Picker-friendly shape that wraps ``UserSummaryDto`` with a
 *  precomputed ``displayName`` so PrimeNG's ``<p-autoComplete>`` can
 *  bind to ``field="displayName"`` (the component does not support a
 *  function-valued ``field`` input). */
interface MemberPickerItem extends UserSummaryDto {
  displayName: string;
}

/** Status filter options surfaced in the ``p-select`` above the table.
 * ``all`` is the sentinel for "no status filter" and is translated into
 * "don't send the ``?status=`` query param" in :meth:`refresh`. */
type StatusFilterValue = 'all' | CourseEnrollmentStatusEnumDto;

/** PrimeNG tag severities used for the per-row enrollment status badge. */
type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

/**
 * "Enrollment" tab of ``/lms/course/:id/edit``: lists every enrollment
 * of the parent course (server-side filtered to instructors only — see
 * :class:`CourseEnrollmentViewSet.get_queryset`) with a status filter
 * and per-row approve / reject / cancel actions. On invite-only
 * courses the tab also surfaces an "Invite a learner" section above
 * the enrollment table — autocomplete picks from the domain
 * membership and pending invitations get their own table with
 * resend / revoke actions.
 */
@Component({
  selector: 'app-lms-course-edit-enrollment-tab',
  templateUrl: './enrollment-tab.html',
  styleUrl: './enrollment-tab.scss',
  imports: [
    FormsModule,
    DatePipe,
    AutoCompleteModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    EmptyStateComponent,
    RelativeDatePipe,
    SelectModule,
    TableModule,
    TagModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCourseEditEnrollmentTab {
  // ---- DI ----------------------------------------------------------------

  private readonly enrollmentSvc = inject(LmsEnrollmentService);
  private readonly domainSvc = inject(DomainService);
  private readonly confirmer = inject(ConfirmationService);
  private readonly toast = inject(AppToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly uiSvc = inject(UiTextService);
  protected readonly ui = this.uiSvc.localized(getLmsCourseEditEnrollmentTabUiText);
  protected readonly lmsCommon = this.uiSvc.localized(getLmsCommonUiText);

  // ---- Inputs ------------------------------------------------------------

  readonly courseId = input.required<number>();
  /** The full course DTO — used to (a) tell whether the course is
   *  invite-only so we surface the invite section, and (b) reach the
   *  domain id so we can preload the autocomplete with that domain's
   *  members. */
  readonly course = input<CourseDetailDto | null>(null);

  // ---- State signals -----------------------------------------------------

  protected readonly rows = signal<CourseEnrollmentDto[]>([]);
  protected readonly loading = signal(false);
  /** Per-row in-flight flag — disables the row's action buttons while a
   *  mutation request is in flight so a double-click can't fire two
   *  approves on the same enrollment. */
  protected readonly busyId = signal<number | null>(null);
  protected readonly statusFilter = signal<StatusFilterValue>('all');

  // Invite-side state
  protected readonly invites = signal<CourseInviteDto[]>([]);
  protected readonly invitesLoading = signal(false);
  protected readonly busyInviteId = signal<number | null>(null);
  protected readonly sending = signal(false);
  /** All domain members — used as the autocomplete source. Fetched
   *  once per course / domain change. Each row carries a precomputed
   *  ``displayName`` so the picker's ``field="displayName"`` binding
   *  can render the "First Last (username)" shape without needing a
   *  function-valued ``[field]`` binding (PrimeNG only supports a
   *  string property name there). */
  private readonly domainMembers = signal<MemberPickerItem[]>([]);
  /** The narrowed picker suggestions matching the current ``query``. */
  protected readonly memberSuggestions = signal<MemberPickerItem[]>([]);
  /** Currently selected invitee (after the autocomplete picks one). */
  protected readonly selectedInvitee = signal<MemberPickerItem | null>(null);

  // ---- Derived -----------------------------------------------------------

  protected readonly statusOptions = computed(() => {
    const labels = this.lmsCommon().enrollmentStatusLabels;
    return [
      {value: 'all' as StatusFilterValue, label: this.ui().filters.status.all},
      {value: CourseEnrollmentStatusEnumDto.Active as StatusFilterValue, label: labels.active},
      {value: CourseEnrollmentStatusEnumDto.Pending as StatusFilterValue, label: labels.pending},
      {value: CourseEnrollmentStatusEnumDto.Completed as StatusFilterValue, label: labels.completed},
      {value: CourseEnrollmentStatusEnumDto.Cancelled as StatusFilterValue, label: labels.cancelled},
    ];
  });

  protected readonly isInviteOnly = computed(
    () => this.course()?.enrollment_mode === EnrollmentModeEnumDto.Invite,
  );

  protected readonly pendingInvites = computed(
    () => this.invites().filter((i) => i.status === 'pending'),
  );

  // ---- Effects -----------------------------------------------------------

  constructor() {
    // (Re-)fetch enrollments whenever the parent shell pushes a new
    // ``courseId`` or the local status filter changes.
    effect(() => {
      const id = this.courseId();
      this.statusFilter();
      if (id > 0) {
        this.refresh();
      } else {
        this.rows.set([]);
      }
    });

    // (Re-)fetch invitations + domain members when the course shifts
    // into invite-only mode (or the course itself changes).
    effect(() => {
      const id = this.courseId();
      const inviteOnly = this.isInviteOnly();
      if (id > 0 && inviteOnly) {
        this.refreshInvites();
        this.loadDomainMembers();
      } else {
        this.invites.set([]);
        this.domainMembers.set([]);
        this.memberSuggestions.set([]);
        this.selectedInvitee.set(null);
      }
    });
  }

  // ---- Public template API ----------------------------------------------

  protected userDisplayName(row: CourseEnrollmentDto): string {
    const u: UserSummaryDto | null | undefined = row.user_detail;
    if (!u) {
      return `#${row.user}`;
    }
    const first = (u.first_name ?? '').trim();
    const last = (u.last_name ?? '').trim();
    if (first && last) {
      return `${first} ${last} (${u.username})`;
    }
    return u.username || `#${row.user}`;
  }

  protected userEmail(row: CourseEnrollmentDto): string {
    return row.user_detail?.email ?? '';
  }

  protected statusLabel(status: CourseEnrollmentStatusEnumDto): string {
    return this.lmsCommon().enrollmentStatusLabels[status];
  }

  protected statusSeverity(status: CourseEnrollmentStatusEnumDto): TagSeverity {
    switch (status) {
      case CourseEnrollmentStatusEnumDto.Active:
        return 'success';
      case CourseEnrollmentStatusEnumDto.Pending:
        return 'warn';
      case CourseEnrollmentStatusEnumDto.Completed:
        return 'info';
      case CourseEnrollmentStatusEnumDto.Cancelled:
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  protected isPending(row: CourseEnrollmentDto): boolean {
    return row.status === CourseEnrollmentStatusEnumDto.Pending;
  }

  protected isActive(row: CourseEnrollmentDto): boolean {
    return row.status === CourseEnrollmentStatusEnumDto.Active;
  }

  protected confirmApprove(row: CourseEnrollmentDto): void {
    const name = this.userDisplayName(row);
    const labels = this.ui();
    this.confirmer.confirm({
      header: labels.actions.confirmHeader,
      message: labels.actions.confirmApprove(name),
      icon: 'pi pi-check-circle',
      acceptLabel: labels.actions.confirmAccept,
      rejectLabel: labels.actions.confirmReject,
      accept: () => this.approve(row),
    });
  }

  protected confirmReject(row: CourseEnrollmentDto): void {
    const name = this.userDisplayName(row);
    const labels = this.ui();
    this.confirmer.confirm({
      header: labels.actions.confirmHeader,
      message: labels.actions.confirmRejectMessage(name),
      icon: 'pi pi-times-circle',
      acceptLabel: labels.actions.confirmAccept,
      rejectLabel: labels.actions.confirmReject,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.reject(row),
    });
  }

  protected confirmCancel(row: CourseEnrollmentDto): void {
    const name = this.userDisplayName(row);
    const labels = this.ui();
    this.confirmer.confirm({
      header: labels.actions.confirmHeader,
      message: labels.actions.confirmCancel(name),
      icon: 'pi pi-ban',
      acceptLabel: labels.actions.confirmAccept,
      rejectLabel: labels.actions.confirmReject,
      acceptButtonStyleClass: 'p-button-warning',
      accept: () => this.cancel(row),
    });
  }

  // ---- Invite-side actions ----------------------------------------------

  protected inviteeDisplayName(u: UserSummaryDto | null | undefined): string {
    if (!u) {
      return '';
    }
    const first = (u.first_name ?? '').trim();
    const last = (u.last_name ?? '').trim();
    if (first && last) {
      return `${first} ${last} (${u.username})`;
    }
    return u.username || `#${u.id}`;
  }

  protected inviteStatusLabel(status: CourseInviteDto['status']): string {
    return this.ui().invite.statusLabels[status];
  }

  protected inviteStatusSeverity(status: CourseInviteDto['status']): TagSeverity {
    switch (status) {
      case 'pending':
        return 'warn';
      case 'accepted':
        return 'success';
      case 'declined':
      case 'revoked':
      case 'expired':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  protected onMemberSearch(event: {query: string}): void {
    const q = (event.query ?? '').trim().toLowerCase();
    const all = this.domainMembers();
    if (!q) {
      this.memberSuggestions.set(all);
      return;
    }
    this.memberSuggestions.set(
      all.filter((m) => {
        const haystack = [
          m.username,
          m.first_name ?? '',
          m.last_name ?? '',
          m.email ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      }),
    );
  }

  protected sendInvite(): void {
    const id = this.courseId();
    const invitee = this.selectedInvitee();
    if (id <= 0 || !invitee || this.sending()) {
      return;
    }
    this.sending.set(true);
    this.enrollmentSvc
      .inviteToCourse(id, invitee.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.selectedInvitee.set(null);
          this.toast.add({severity: 'success', summary: this.ui().invite.toasts.sendSuccess});
          this.refreshInvites();
        },
        error: (err: unknown) => {
          this.sending.set(false);
          logApiError('lms.course-edit.invite.send', err);
          this.toast.addApiError(err, this.ui().invite.toasts.sendFailed);
        },
      });
  }

  protected confirmResend(invite: CourseInviteDto): void {
    const name = this.inviteeDisplayName(invite.invitee_detail);
    const labels = this.ui();
    this.confirmer.confirm({
      header: labels.actions.confirmHeader,
      message: labels.invite.actions.confirmResend(name),
      icon: 'pi pi-send',
      acceptLabel: labels.actions.confirmAccept,
      rejectLabel: labels.actions.confirmReject,
      accept: () => this.resend(invite),
    });
  }

  protected confirmRevoke(invite: CourseInviteDto): void {
    const name = this.inviteeDisplayName(invite.invitee_detail);
    const labels = this.ui();
    this.confirmer.confirm({
      header: labels.actions.confirmHeader,
      message: labels.invite.actions.confirmRevoke(name),
      icon: 'pi pi-ban',
      acceptLabel: labels.actions.confirmAccept,
      rejectLabel: labels.actions.confirmReject,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.revoke(invite),
    });
  }

  // ---- Internals ---------------------------------------------------------

  private refresh(): void {
    const id = this.courseId();
    if (id <= 0) {
      return;
    }
    const status = this.statusFilter();
    const params: {status?: string} = status === 'all' ? {} : {status};

    this.loading.set(true);
    this.enrollmentSvc
      .listForCourse(id, params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.rows.set(rows);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          logApiError('lms.course-edit.enrollment.list', err);
          this.toast.addApiError(err, this.ui().toasts.loadFailed);
          this.loading.set(false);
        },
      });
  }

  private refreshInvites(): void {
    const id = this.courseId();
    if (id <= 0) {
      return;
    }
    this.invitesLoading.set(true);
    this.enrollmentSvc
      .listInvitesForCourse(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.invites.set(rows);
          this.invitesLoading.set(false);
        },
        error: (err: unknown) => {
          logApiError('lms.course-edit.invite.list', err);
          this.toast.addApiError(err, this.ui().invite.toasts.loadFailed);
          this.invitesLoading.set(false);
        },
      });
  }

  private loadDomainMembers(): void {
    const domainId = this.course()?.domain ?? null;
    if (!domainId) {
      this.domainMembers.set([]);
      this.memberSuggestions.set([]);
      return;
    }
    this.domainSvc
      .retrieve(domainId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d: {members?: UserSummaryDto[]}) => {
          const members = (d.members ?? []).map<MemberPickerItem>((u) => ({
            ...u,
            displayName: this.inviteeDisplayName(u),
          }));
          this.domainMembers.set(members);
          this.memberSuggestions.set(members);
        },
        error: (err: unknown) => {
          logApiError('lms.course-edit.invite.members', err);
          this.domainMembers.set([]);
          this.memberSuggestions.set([]);
        },
      });
  }

  private approve(row: CourseEnrollmentDto): void {
    this.busyId.set(row.id);
    this.enrollmentSvc
      .approve(row.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.toast.add({severity: 'success', summary: this.ui().toasts.approveSuccess});
          this.refresh();
        },
        error: (err: unknown) => {
          this.busyId.set(null);
          logApiError('lms.course-edit.enrollment.approve', err);
          this.toast.addApiError(err, this.ui().toasts.approveFailed);
        },
      });
  }

  private reject(row: CourseEnrollmentDto): void {
    this.busyId.set(row.id);
    this.enrollmentSvc
      .reject(row.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.toast.add({severity: 'success', summary: this.ui().toasts.rejectSuccess});
          this.refresh();
        },
        error: (err: unknown) => {
          this.busyId.set(null);
          logApiError('lms.course-edit.enrollment.reject', err);
          this.toast.addApiError(err, this.ui().toasts.rejectFailed);
        },
      });
  }

  private cancel(row: CourseEnrollmentDto): void {
    this.busyId.set(row.id);
    this.enrollmentSvc
      .cancel(row.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.toast.add({severity: 'success', summary: this.ui().toasts.cancelSuccess});
          this.refresh();
        },
        error: (err: unknown) => {
          this.busyId.set(null);
          logApiError('lms.course-edit.enrollment.cancel', err);
          this.toast.addApiError(err, this.ui().toasts.cancelFailed);
        },
      });
  }

  private resend(invite: CourseInviteDto): void {
    this.busyInviteId.set(invite.id);
    this.enrollmentSvc
      .resendInvite(invite.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busyInviteId.set(null);
          this.toast.add({severity: 'success', summary: this.ui().invite.toasts.resendSuccess});
          this.refreshInvites();
        },
        error: (err: unknown) => {
          this.busyInviteId.set(null);
          logApiError('lms.course-edit.invite.resend', err);
          this.toast.addApiError(err, this.ui().invite.toasts.resendFailed);
        },
      });
  }

  private revoke(invite: CourseInviteDto): void {
    this.busyInviteId.set(invite.id);
    this.enrollmentSvc
      .revokeInvite(invite.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busyInviteId.set(null);
          this.toast.add({severity: 'success', summary: this.ui().invite.toasts.revokeSuccess});
          this.refreshInvites();
        },
        error: (err: unknown) => {
          this.busyInviteId.set(null);
          logApiError('lms.course-edit.invite.revoke', err);
          this.toast.addApiError(err, this.ui().invite.toasts.revokeFailed);
        },
      });
  }
}
