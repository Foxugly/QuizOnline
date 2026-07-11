import {DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {BadgeModule} from 'primeng/badge';
import {ButtonModule} from 'primeng/button';
import {ConfirmationService} from 'primeng/api';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {DialogModule} from 'primeng/dialog';
import {MultiSelectModule} from 'primeng/multiselect';
import {SelectButtonModule} from 'primeng/selectbutton';
import {TableModule} from 'primeng/table';
import {TagModule} from 'primeng/tag';
import {TextareaModule} from 'primeng/textarea';
import {TooltipModule} from 'primeng/tooltip';

import {DomainInviteReadDto} from '../../api/generated/model/domain-invite-read';
import {DomainInviteResultDto} from '../../api/generated/model/domain-invite-result';
import {DomainJoinRequestReadDto} from '../../api/generated/model/domain-join-request-read';
import {JoinRequestStatusEnumDto} from '../../api/generated/model/join-request-status-enum';
import {DomainEditUiText} from '../../pages/domain/edit/domain-edit.i18n';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {interp, plural} from '../../shared/i18n/format';
import {BulkActionsComponent, BulkActionOption} from '../../shared/components/bulk-actions/bulk-actions';
import {EmptyStateComponent} from '../../shared/components/empty-state/empty-state';
import {RelativeDatePipe} from '../../shared/pipes/relative-date.pipe';

import type {JoinRequestStatusFilter} from '../../services/domain/domain-edit-api';
import type {
  AdditionalDomainOption,
  InviteRequest,
  InviteResend,
  InviteRevoke,
} from '../domain-members-tab/domain-members-tab';

export type JoinRequestApprove = {requestId: number};
export type JoinRequestReject = {requestId: number; reason: string};
export type JoinRequestBulkApprove = {requestIds: number[]};
export type JoinRequestBulkReject = {requestIds: number[]; reason: string};

@Component({
  selector: 'app-domain-invitations-tab',
  imports: [
    DatePipe,
    FormsModule,
    BadgeModule,
    BulkActionsComponent,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    MultiSelectModule,
    SelectButtonModule,
    TableModule,
    TagModule,
    TextareaModule,
    TooltipModule,
    EmptyStateComponent,
    RelativeDatePipe,
  ],
  providers: [ConfirmationService],
  templateUrl: './domain-invitations-tab.html',
  styleUrl: './domain-invitations-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DomainInvitationsTab {
  readonly text = input.required<DomainEditUiText>();
  readonly canInvite = input<boolean>(false);
  readonly canModerate = input<boolean>(false);

  readonly joinRequests = input<DomainJoinRequestReadDto[]>([]);
  readonly joinRequestsLoading = input<boolean>(false);
  readonly statusFilter = input<JoinRequestStatusFilter>('pending');
  readonly applyingBulk = input<boolean>(false);

  readonly invitations = input<DomainInviteReadDto[]>([]);
  readonly inviting = input<boolean>(false);
  readonly inviteResults = input<DomainInviteResultDto[] | null>(null);
  readonly additionalDomainOptions = input<AdditionalDomainOption[]>([]);

  readonly statusFilterChange = output<JoinRequestStatusFilter>();
  readonly approveRequest = output<JoinRequestApprove>();
  readonly rejectRequest = output<JoinRequestReject>();
  readonly bulkApproveRequests = output<JoinRequestBulkApprove>();
  readonly bulkRejectRequests = output<JoinRequestBulkReject>();

  readonly inviteRequest = output<InviteRequest>();
  readonly inviteResend = output<InviteResend>();
  readonly inviteRevoke = output<InviteRevoke>();

  readonly selectedRows = signal<DomainJoinRequestReadDto[]>([]);
  readonly rejectDialogVisible = signal<boolean>(false);
  readonly rejectReason = signal<string>('');
  readonly rejectingRequest = signal<DomainJoinRequestReadDto | null>(null);

  readonly bulkRejectDialogVisible = signal<boolean>(false);
  readonly bulkRejectReason = signal<string>('');
  readonly pendingBulkIds = signal<number[]>([]);

  readonly inviteDialogVisible = signal<boolean>(false);
  readonly inviteInput = signal<string>('');
  readonly selectedAdditionalDomainIds = signal<number[]>([]);

  private readonly uiText = inject(UiTextService);
  private readonly confirmationService = inject(ConfirmationService);
  readonly adminLabels = computed(() => this.uiText.ui().admin.joinRequests);

  protected bulkSelectedText(n: number): string {
    return plural(this.adminLabels().bulkSelectedCount, n);
  }

  protected bulkRejectMessageText(n: number): string {
    return interp(this.adminLabels().bulkRejectMessage, {n});
  }

  readonly statusOptions = computed(() => {
    const labels = this.adminLabels();
    return [
      {label: labels.pending, value: 'pending' as JoinRequestStatusFilter},
      {label: labels.approved, value: 'approved' as JoinRequestStatusFilter},
      {label: labels.rejected, value: 'rejected' as JoinRequestStatusFilter},
      {label: labels.all, value: 'all' as JoinRequestStatusFilter},
    ];
  });

  readonly bulkActionOptions = computed<BulkActionOption[]>(() => {
    const labels = this.adminLabels();
    return [
      {label: labels.bulkApprove, value: 'approve', icon: 'pi pi-check-circle'},
      {label: labels.bulkReject, value: 'reject', icon: 'pi pi-times-circle', danger: true},
    ];
  });

  readonly selectedCount = computed(() => this.selectedRows().length);
  readonly canBulk = computed(() => this.canModerate() && this.statusFilter() === 'pending');
  readonly pendingCount = computed(
    () => this.joinRequests().filter((r) => this.isPending(r)).length,
  );

  onStatusFilterChange(value: JoinRequestStatusFilter): void {
    this.selectedRows.set([]);
    this.statusFilterChange.emit(value);
  }

  onSelectionChange(rows: DomainJoinRequestReadDto[]): void {
    this.selectedRows.set(rows);
  }

  isPending(request: DomainJoinRequestReadDto): boolean {
    return request.status === JoinRequestStatusEnumDto.Pending;
  }

  statusSeverity(status: JoinRequestStatusEnumDto): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
      case JoinRequestStatusEnumDto.Pending:
        return 'warn';
      case JoinRequestStatusEnumDto.Approved:
        return 'success';
      case JoinRequestStatusEnumDto.Rejected:
        return 'danger';
      case JoinRequestStatusEnumDto.Cancelled:
        return 'info';
      default:
        return 'info';
    }
  }

  statusLabel(status: JoinRequestStatusEnumDto): string {
    const labels = this.adminLabels();
    switch (status) {
      case JoinRequestStatusEnumDto.Pending:
        return labels.pending;
      case JoinRequestStatusEnumDto.Approved:
        return labels.approved;
      case JoinRequestStatusEnumDto.Rejected:
        return labels.rejected;
      case JoinRequestStatusEnumDto.Cancelled:
        return labels.cancelled;
      default:
        return status;
    }
  }

  approve(request: DomainJoinRequestReadDto): void {
    if (!this.canModerate() || !this.isPending(request)) {
      return;
    }
    this.approveRequest.emit({requestId: request.id});
  }

  openRejectDialog(request: DomainJoinRequestReadDto): void {
    if (!this.canModerate() || !this.isPending(request)) {
      return;
    }
    this.rejectingRequest.set(request);
    this.rejectReason.set('');
    this.rejectDialogVisible.set(true);
  }

  confirmReject(): void {
    const request = this.rejectingRequest();
    if (!request) {
      return;
    }
    this.rejectRequest.emit({requestId: request.id, reason: this.rejectReason()});
    this.rejectDialogVisible.set(false);
    this.rejectingRequest.set(null);
    this.rejectReason.set('');
  }

  applyBulk(action: string): void {
    if (!this.canBulk() || this.applyingBulk() || this.selectedCount() === 0) {
      return;
    }
    const ids = this.selectedRows().map((r) => r.id);
    if (action === 'approve') {
      this.bulkApproveRequests.emit({requestIds: ids});
      this.selectedRows.set([]);
      return;
    }
    if (action === 'reject') {
      this.pendingBulkIds.set(ids);
      this.bulkRejectReason.set('');
      this.bulkRejectDialogVisible.set(true);
    }
  }

  confirmBulkReject(): void {
    const ids = this.pendingBulkIds();
    if (!ids.length) {
      this.bulkRejectDialogVisible.set(false);
      return;
    }
    this.bulkRejectRequests.emit({requestIds: ids, reason: this.bulkRejectReason()});
    this.bulkRejectDialogVisible.set(false);
    this.bulkRejectReason.set('');
    this.pendingBulkIds.set([]);
    this.selectedRows.set([]);
  }

  cancelBulkReject(): void {
    this.bulkRejectDialogVisible.set(false);
    this.bulkRejectReason.set('');
    this.pendingBulkIds.set([]);
  }

  openInviteDialog(): void {
    this.inviteInput.set('');
    this.selectedAdditionalDomainIds.set([]);
    this.inviteDialogVisible.set(true);
  }

  closeInviteDialog(): void {
    this.inviteDialogVisible.set(false);
  }

  submitInvite(): void {
    const emails = this.parseEmails(this.inviteInput());
    if (!emails.length || this.inviting()) {
      return;
    }
    this.inviteRequest.emit({
      emails,
      additionalDomainIds: this.selectedAdditionalDomainIds(),
    });
  }

  onResendInvitation(invite: DomainInviteReadDto): void {
    if (!this.canInvite()) {
      return;
    }
    this.inviteResend.emit({inviteId: invite.id});
  }

  confirmRevokeInvitation(invite: DomainInviteReadDto): void {
    if (!this.canInvite()) {
      return;
    }
    const labels = this.text().members;
    this.confirmationService.confirm({
      header: labels.invitationConfirmRevokeHeader,
      message: labels.invitationConfirmRevokeMessage(invite.email),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: labels.invitationConfirmRevokeAccept,
      rejectLabel: labels.invitationConfirmRevokeCancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.inviteRevoke.emit({inviteId: invite.id, email: invite.email}),
    });
  }

  private parseEmails(raw: string): string[] {
    if (!raw) {
      return [];
    }
    const seen = new Set<string>();
    return raw
      .split(/[,;\s\n]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => {
        if (!s || seen.has(s)) {
          return false;
        }
        seen.add(s);
        return true;
      });
  }
}
