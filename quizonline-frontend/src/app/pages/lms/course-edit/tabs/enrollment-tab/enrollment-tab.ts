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
import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {SelectModule} from 'primeng/select';
import {TableModule} from 'primeng/table';
import {TagModule} from 'primeng/tag';

import {CourseEnrollmentDto} from '../../../../../api/generated/model/course-enrollment';
import {CourseEnrollmentStatusEnumDto} from '../../../../../api/generated/model/course-enrollment-status-enum';
import {CourseDetailDto} from '../../../../../api/generated/model/course-detail';
import {UserSummaryDto} from '../../../../../api/generated/model/user-summary';

import {LmsEnrollmentService} from '../../../../../services/lms/lms-enrollment.service';
import {logApiError} from '../../../../../shared/api/api-errors';
import {EmptyStateComponent} from '../../../../../shared/components/empty-state/empty-state';
import {UiTextService} from '../../../../../shared/i18n/ui-text.service';
import {getLmsCommonUiText} from '../../../../../shared/lms/lms-common.i18n';
import {RelativeDatePipe} from '../../../../../shared/pipes/relative-date.pipe';
import {AppToastService} from '../../../../../shared/toast/app-toast.service';

import {getLmsCourseEditEnrollmentTabUiText} from './enrollment-tab.i18n';

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
 * and per-row approve / reject / cancel actions. Approving or rejecting
 * a pending request flips the row's status; cancelling an active one
 * marks it ``cancelled``. The table re-fetches itself after every
 * mutation so the badge / available actions stay in sync without
 * needing the parent shell to re-fetch the course.
 *
 * Mirrors the shape of the join-requests admin page (pending /
 * approved / rejected filter, confirm-dialog gated row actions) but
 * scoped to a single course so instructors don't have to leave the
 * course-edit shell to moderate their roster.
 */
@Component({
  selector: 'app-lms-course-edit-enrollment-tab',
  templateUrl: './enrollment-tab.html',
  styleUrl: './enrollment-tab.scss',
  imports: [
    FormsModule,
    DatePipe,
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
  private readonly confirmer = inject(ConfirmationService);
  private readonly toast = inject(AppToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly uiSvc = inject(UiTextService);
  protected readonly ui = this.uiSvc.localized(getLmsCourseEditEnrollmentTabUiText);
  protected readonly lmsCommon = this.uiSvc.localized(getLmsCommonUiText);

  // ---- Inputs ------------------------------------------------------------

  readonly courseId = input.required<number>();
  /** The full course DTO, piped down from the shell. Currently unused by
   *  this tab but accepted for parity with the other tabs so the shell
   *  template stays uniform — keeps the door open for a future
   *  "instructor-only enrollment mode hint" banner. */
  readonly course = input<CourseDetailDto | null>(null);

  // ---- State signals -----------------------------------------------------

  protected readonly rows = signal<CourseEnrollmentDto[]>([]);
  protected readonly loading = signal(false);
  /** Per-row in-flight flag — disables the row's action buttons while a
   *  mutation request is in flight so a double-click can't fire two
   *  approves on the same enrollment. */
  protected readonly busyId = signal<number | null>(null);
  protected readonly statusFilter = signal<StatusFilterValue>('all');

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

  // ---- Effects -----------------------------------------------------------

  constructor() {
    // (Re-)fetch whenever the parent shell pushes a new ``courseId`` or
    // the local status filter changes.
    effect(() => {
      const id = this.courseId();
      // Read the filter signal so the effect re-runs when it changes.
      this.statusFilter();
      if (id > 0) {
        this.refresh();
      } else {
        this.rows.set([]);
      }
    });
  }

  // ---- Public template API ----------------------------------------------

  /** Resolved display name for a row's user. Prefers the longer
   *  ``first last (username)`` form built client-side; falls back to
   *  the username or the bare id when the backend hasn't populated
   *  ``user_detail`` (e.g. tombstone row). */
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
}
