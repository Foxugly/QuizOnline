import {CommonModule, DatePipe} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {finalize} from 'rxjs';
import {BadgeModule} from 'primeng/badge';
import {ButtonModule} from 'primeng/button';
import {DialogModule} from 'primeng/dialog';
import {TextareaModule} from 'primeng/textarea';
import {SelectButtonModule} from 'primeng/selectbutton';
import {TableModule} from 'primeng/table';
import {TagModule} from 'primeng/tag';
import {DomainApi as DomainApiService} from '../../../api/generated/api/domain.service';
import {DomainJoinRequestBulkResultDto} from '../../../api/generated/model/domain-join-request-bulk-result';
import {DomainJoinRequestReadDto} from '../../../api/generated/model/domain-join-request-read';
import {JoinRequestStatusEnumDto} from '../../../api/generated/model/join-request-status-enum';
import {DomainReadDto} from '../../../api/generated/model/domain-read';
import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {UserService} from '../../../services/user/user';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {resolveApiBaseUrl} from '../../../shared/api/runtime-api-base-url';
import {BulkActionsComponent, BulkActionOption} from '../../../shared/components/bulk-actions/bulk-actions';
import {logApiError} from '../../../shared/api/api-errors';
import {AppToastService} from '../../../shared/toast/app-toast.service';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';
type BulkAction = 'approve' | 'reject';

@Component({
  selector: 'app-domain-join-requests',
  imports: [
    CommonModule,
    FormsModule,
    BadgeModule,
    BulkActionsComponent,
    ButtonModule,
    DialogModule,
    TextareaModule,
    SelectButtonModule,
    TableModule,
    TagModule,
    DatePipe,
  ],
  templateUrl: './domain-join-requests.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DomainJoinRequestsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly domainApi = inject(DomainApiService);
  private readonly http = inject(HttpClient);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(AppToastService);
  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/domain`;

  readonly domainId = Number(this.route.snapshot.paramMap.get('domainId'));

  readonly domain = signal<DomainReadDto | null>(null);
  readonly requests = signal<DomainJoinRequestReadDto[]>([]);
  readonly loading = signal(false);
  readonly statusFilter = signal<StatusFilter>('pending');

  readonly rejectDialogVisible = signal(false);
  readonly rejectReason = signal('');
  readonly rejectingRequest = signal<DomainJoinRequestReadDto | null>(null);

  /** Multi-row selection state for bulk approve/reject. Lives only while
   *  the filter is "pending"; switching status clears it. */
  readonly selectedRows = signal<DomainJoinRequestReadDto[]>([]);
  readonly applyingBulk = signal(false);
  readonly bulkRejectDialogVisible = signal(false);
  readonly bulkRejectReason = signal('');

  readonly bulkActionOptions = computed<BulkActionOption[]>(() => {
    const labels = this.t();
    return [
      {label: labels.bulkApprove, value: 'approve', icon: 'pi pi-check-circle'},
      {label: labels.bulkReject, value: 'reject', icon: 'pi pi-times-circle', danger: true},
    ];
  });
  readonly selectedCount = computed(() => this.selectedRows().length);
  readonly canBulk = computed(() => this.statusFilter() === 'pending');

  readonly currentLang = computed(() => this.userService.currentLang ?? LanguageEnumDto.Fr);
  private readonly uiText = inject(UiTextService);
  readonly t = computed(() => this.uiText.ui().admin.joinRequests);

  readonly statusOptions = computed(() => {
    const labels = this.t();
    return [
      {label: labels.pending, value: 'pending' as StatusFilter},
      {label: labels.approved, value: 'approved' as StatusFilter},
      {label: labels.rejected, value: 'rejected' as StatusFilter},
      {label: labels.all, value: 'all' as StatusFilter},
    ];
  });

  readonly domainName = computed(() => {
    const d = this.domain();
    if (!d) {
      return '';
    }
    const lang = this.currentLang();
    const tr = d.translations;
    if (!tr) {
      return `Domain #${d.id}`;
    }
    const entry = tr[lang] ?? tr['fr'] ?? tr['en'] ?? Object.values(tr)[0];
    return entry?.name ?? `Domain #${d.id}`;
  });

  readonly pendingCount = computed(() => {
    return this.domain()?.pending_join_requests_count ?? 0;
  });

  private userMap = new Map<number, string>();

  ngOnInit(): void {
    this.loadDomain();
    this.loadRequests();
  }

  onStatusFilterChange(): void {
    // Selection is meaningless once the filter leaves "pending" — clear it
    // so the bulk-actions bar resets too.
    this.selectedRows.set([]);
    this.loadRequests();
  }

  onSelectionChange(rows: DomainJoinRequestReadDto[]): void {
    this.selectedRows.set(rows);
  }

  applyBulk(action: string): void {
    if (this.applyingBulk() || this.selectedCount() === 0) {
      return;
    }
    if (action === 'approve') {
      this.runBulkApprove();
      return;
    }
    if (action === 'reject') {
      this.bulkRejectReason.set('');
      this.bulkRejectDialogVisible.set(true);
    }
  }

  confirmBulkReject(): void {
    const reason = this.bulkRejectReason();
    const ids = this.selectedRows().map(row => row.id);
    if (!ids.length) {
      this.bulkRejectDialogVisible.set(false);
      return;
    }
    this.applyingBulk.set(true);
    this.domainApi
      .domainJoinRequestBulkRejectCreate({
        domainId: this.domainId,
        domainJoinRequestBulkRejectRequestDto: {request_ids: ids, reason},
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.applyingBulk.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.bulkRejectDialogVisible.set(false);
          this.bulkRejectReason.set('');
          this.selectedRows.set([]);
          this.notifyBulkResult(result);
          this.loadDomain();
          this.loadRequests();
        },
        error: (err) => {
          logApiError('domain.join-requests.bulk-reject', err);
          this.toast.add({severity: 'error', summary: this.t().bulkActionFailed});
        },
      });
  }

  cancelBulkReject(): void {
    this.bulkRejectDialogVisible.set(false);
    this.bulkRejectReason.set('');
  }

  private runBulkApprove(): void {
    const ids = this.selectedRows().map(row => row.id);
    if (!ids.length) {
      return;
    }
    this.applyingBulk.set(true);
    this.domainApi
      .domainJoinRequestBulkApproveCreate({
        domainId: this.domainId,
        domainJoinRequestBulkApproveRequestDto: {request_ids: ids},
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.applyingBulk.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.selectedRows.set([]);
          this.notifyBulkResult(result);
          this.loadDomain();
          this.loadRequests();
        },
        error: (err) => {
          logApiError('domain.join-requests.bulk-approve', err);
          this.toast.add({severity: 'error', summary: this.t().bulkActionFailed});
        },
      });
  }

  private notifyBulkResult(result: DomainJoinRequestBulkResultDto): void {
    const labels = this.t();
    this.toast.add({
      severity: result.skipped > 0 ? 'warn' : 'success',
      summary: labels.bulkResultTitle,
      detail: labels.bulkResultDetail(result.processed, result.skipped),
    });
  }

  userNameFor(userId: number): string {
    return this.userMap.get(userId) ?? `User #${userId}`;
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
    const labels = this.t();
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

  isPending(request: DomainJoinRequestReadDto): boolean {
    return request.status === JoinRequestStatusEnumDto.Pending;
  }

  approve(request: DomainJoinRequestReadDto): void {
    this.domainApi.domainJoinRequestApproveCreate({domainId: this.domainId, reqId: request.id})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadDomain();
        this.loadRequests();
      });
  }

  openRejectDialog(request: DomainJoinRequestReadDto): void {
    this.rejectingRequest.set(request);
    this.rejectReason.set('');
    this.rejectDialogVisible.set(true);
  }

  confirmReject(): void {
    const request = this.rejectingRequest();
    if (!request) {
      return;
    }
    const url = `${this.apiBaseUrl}/${this.domainId}/join-request/${request.id}/reject/`;
    this.http.post<DomainJoinRequestReadDto>(url, {reason: this.rejectReason()})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.rejectDialogVisible.set(false);
        this.rejectingRequest.set(null);
        this.loadDomain();
        this.loadRequests();
      });
  }

  cancelReject(): void {
    this.rejectDialogVisible.set(false);
    this.rejectingRequest.set(null);
  }

  private loadDomain(): void {
    this.domainApi.domainRetrieve({domainId: this.domainId})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((domain) => {
        this.domain.set(domain);
        this.buildUserMap(domain);
      });
  }

  private buildUserMap(domain: DomainReadDto): void {
    this.userMap.clear();
    if (domain.owner) {
      this.userMap.set(domain.owner.id, domain.owner.username);
    }
    for (const m of domain.managers ?? []) {
      this.userMap.set(m.id, m.username);
    }
    for (const m of domain.members ?? []) {
      this.userMap.set(m.id, m.username);
    }
  }

  private loadRequests(): void {
    this.loading.set(true);
    const filter = this.statusFilter();
    const statusParam = filter === 'all' ? '' : filter;
    const url = `${this.apiBaseUrl}/${this.domainId}/join-request/${statusParam ? '?status=' + statusParam : ''}`;
    this.http.get<{count: number; results: DomainJoinRequestReadDto[]}>(url)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((response) => {
        this.requests.set(response.results ?? []);
      });
  }
}
