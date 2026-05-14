import {DestroyRef, Injectable, Signal, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {of} from 'rxjs';
import {catchError, finalize} from 'rxjs/operators';

import {DomainJoinRequestBulkResultDto} from '../../../api/generated/model/domain-join-request-bulk-result';
import {DomainJoinRequestReadDto} from '../../../api/generated/model/domain-join-request-read';
import {DomainEditApi, JoinRequestStatusFilter} from '../../../services/domain/domain-edit-api';
import {logApiError} from '../../../shared/api/api-errors';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {AppToastService} from '../../../shared/toast/app-toast.service';
import {getDomainEditUiText} from './domain-edit.i18n';

export interface DomainEditJoinRequestsBinding {
  domainId: number;
  /** Hand-off so the page can refresh its ``domain`` signal after a moderation action (pending count, member list, …). */
  refreshDomain: () => void;
}

/**
 * Join-requests slice of /domain/{id}/edit. Owns the list state,
 * status filter, single + bulk approve/reject actions, and the
 * bulk-result toast. The page exposes ``pendingCount()`` via the
 * controller's derived signal so the header badge stays in sync
 * without duplicating state.
 */
@Injectable()
export class DomainEditJoinRequestsController {
  private readonly editApi = inject(DomainEditApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(AppToastService);
  private readonly editText = inject(UiTextService).localized(getDomainEditUiText);
  private readonly adminUi = inject(UiTextService).ui;

  readonly rows = signal<DomainJoinRequestReadDto[]>([]);
  readonly loading = signal(false);
  readonly statusFilter = signal<JoinRequestStatusFilter>('pending');
  readonly applyingBulk = signal(false);
  readonly pendingCount: Signal<number> = computed(
    () => this.rows().filter((r) => r.status === 'pending').length,
  );

  private binding: DomainEditJoinRequestsBinding | null = null;

  bind(binding: DomainEditJoinRequestsBinding): void {
    this.binding = binding;
  }

  /** Idempotent initial load — called by the page once moderation rights are known. */
  load(): void {
    if (!this.binding) {
      return;
    }
    this.loading.set(true);
    this.editApi.listJoinRequests(this.binding.domainId, this.statusFilter())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          logApiError('domain.edit.load-join-requests', err);
          return of([] as DomainJoinRequestReadDto[]);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((rows) => this.rows.set(rows));
  }

  onStatusFilterChange(value: JoinRequestStatusFilter): void {
    this.statusFilter.set(value);
    this.load();
  }

  onApprove(evt: {requestId: number}): void {
    const binding = this.binding;
    if (!binding) {
      return;
    }
    this.editApi.approveJoinRequest(binding.domainId, evt.requestId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.load();
          binding.refreshDomain();
        },
        error: (err) => {
          logApiError('domain.edit.join-request-approve', err);
          this.toast.addApiError(err, this.editText().members.actionFailed);
        },
      });
  }

  onReject(evt: {requestId: number; reason: string}): void {
    const binding = this.binding;
    if (!binding) {
      return;
    }
    this.editApi.rejectJoinRequest(binding.domainId, evt.requestId, evt.reason)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.load();
          binding.refreshDomain();
        },
        error: (err) => {
          logApiError('domain.edit.join-request-reject', err);
          this.toast.addApiError(err, this.editText().members.actionFailed);
        },
      });
  }

  onBulkApprove(evt: {requestIds: number[]}): void {
    const binding = this.binding;
    if (!binding || !evt.requestIds.length || this.applyingBulk()) {
      return;
    }
    this.applyingBulk.set(true);
    this.editApi.bulkApproveJoinRequests(binding.domainId, evt.requestIds)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.applyingBulk.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.notifyBulkResult(result);
          this.load();
          binding.refreshDomain();
        },
        error: (err) => {
          logApiError('domain.edit.join-request-bulk-approve', err);
          this.toast.addApiError(err, this.editText().members.actionFailed);
        },
      });
  }

  onBulkReject(evt: {requestIds: number[]; reason: string}): void {
    const binding = this.binding;
    if (!binding || !evt.requestIds.length || this.applyingBulk()) {
      return;
    }
    this.applyingBulk.set(true);
    this.editApi.bulkRejectJoinRequests(binding.domainId, evt.requestIds, evt.reason)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.applyingBulk.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.notifyBulkResult(result);
          this.load();
          binding.refreshDomain();
        },
        error: (err) => {
          logApiError('domain.edit.join-request-bulk-reject', err);
          this.toast.addApiError(err, this.editText().members.actionFailed);
        },
      });
  }

  private notifyBulkResult(result: DomainJoinRequestBulkResultDto): void {
    const labels = this.adminUi().admin.joinRequests;
    this.toast.add({
      severity: result.skipped > 0 ? 'warn' : 'success',
      summary: labels.bulkResultTitle,
      detail: labels.bulkResultDetail(result.processed, result.skipped),
    });
  }
}
