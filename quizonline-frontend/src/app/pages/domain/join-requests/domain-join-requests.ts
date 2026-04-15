import {CommonModule, DatePipe} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {Component, computed, DestroyRef, inject, OnInit, signal} from '@angular/core';
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
import {DomainJoinRequestReadDto} from '../../../api/generated/model/domain-join-request-read';
import {DomainJoinRequestReadStatusEnumDto} from '../../../api/generated/model/domain-join-request-read-status-enum';
import {DomainReadDto} from '../../../api/generated/model/domain-read';
import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {UserService} from '../../../services/user/user';
import {getUiText} from '../../../shared/i18n/ui-text';
import {resolveApiBaseUrl} from '../../../shared/api/runtime-api-base-url';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

@Component({
  selector: 'app-domain-join-requests',
  imports: [
    CommonModule,
    FormsModule,
    BadgeModule,
    ButtonModule,
    DialogModule,
    TextareaModule,
    SelectButtonModule,
    TableModule,
    TagModule,
    DatePipe,
  ],
  templateUrl: './domain-join-requests.html',
})
export class DomainJoinRequestsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly domainApi = inject(DomainApiService);
  private readonly http = inject(HttpClient);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/domain`;

  readonly domainId = Number(this.route.snapshot.paramMap.get('domainId'));

  readonly domain = signal<DomainReadDto | null>(null);
  readonly requests = signal<DomainJoinRequestReadDto[]>([]);
  readonly loading = signal(false);
  readonly statusFilter = signal<StatusFilter>('pending');

  readonly rejectDialogVisible = signal(false);
  readonly rejectReason = signal('');
  readonly rejectingRequest = signal<DomainJoinRequestReadDto | null>(null);

  readonly currentLang = computed(() => this.userService.currentLang ?? LanguageEnumDto.Fr);
  readonly t = computed(() => getUiText(this.currentLang()).admin.joinRequests);

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
    this.loadRequests();
  }

  userNameFor(userId: number): string {
    return this.userMap.get(userId) ?? `User #${userId}`;
  }

  statusSeverity(status: DomainJoinRequestReadStatusEnumDto): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
      case DomainJoinRequestReadStatusEnumDto.Pending:
        return 'warn';
      case DomainJoinRequestReadStatusEnumDto.Approved:
        return 'success';
      case DomainJoinRequestReadStatusEnumDto.Rejected:
        return 'danger';
      case DomainJoinRequestReadStatusEnumDto.Cancelled:
        return 'info';
      default:
        return 'info';
    }
  }

  statusLabel(status: DomainJoinRequestReadStatusEnumDto): string {
    const labels = this.t();
    switch (status) {
      case DomainJoinRequestReadStatusEnumDto.Pending:
        return labels.pending;
      case DomainJoinRequestReadStatusEnumDto.Approved:
        return labels.approved;
      case DomainJoinRequestReadStatusEnumDto.Rejected:
        return labels.rejected;
      case DomainJoinRequestReadStatusEnumDto.Cancelled:
        return labels.cancelled;
      default:
        return status;
    }
  }

  isPending(request: DomainJoinRequestReadDto): boolean {
    return request.status === DomainJoinRequestReadStatusEnumDto.Pending;
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
