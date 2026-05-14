import {Component, computed, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {FormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {forkJoin} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {TooltipModule} from 'primeng/tooltip';
import {CheckboxModule} from 'primeng/checkbox';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {InputTextModule} from 'primeng/inputtext';
import {PaginatorModule} from 'primeng/paginator';
import {TableModule} from 'primeng/table';
import {ConfirmationService} from 'primeng/api';
import {DomainReadDto} from '../../../api/generated/model/domain-read';
import {JoinPolicyEnumDto} from '../../../api/generated/model/join-policy-enum';
import {DomainService, DomainTranslationDto} from '../../../services/domain/domain';
import {BulkActionsComponent, BulkActionOption} from '../../../shared/components/bulk-actions/bulk-actions';
import {selectTranslation} from '../../../shared/i18n/select-translation';
import {UserService} from '../../../services/user/user';
import {logApiError} from '../../../shared/api/api-errors';
import {getDomainListUiText} from './domain-list.i18n';

type BulkAction = 'activate' | 'deactivate' | 'delete';

type DomainListRow = DomainReadDto & {
  name: string;
  subjectsCount: number;
  questionsCount: number;
  pendingJoinRequests: number;
};

@Component({
  selector: 'app-domain-list',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    CheckboxModule,
    ConfirmDialogModule,
    InputTextModule,
    PaginatorModule,
    TableModule,
    TooltipModule,
    BulkActionsComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './domain-list.html',
  styleUrl: './domain-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DomainList implements OnInit {
  private domainService = inject(DomainService);
  private userService: UserService = inject(UserService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);

  readonly editorUi = inject(UiTextService).editor;
  readonly ui = inject(UiTextService).ui;
  readonly uiText = inject(UiTextService).localized(getDomainListUiText);
  domains = signal<DomainReadDto[]>([]);
  q = signal('');
  currentLang = computed(() => this.userService.currentLang);
  rowsData = computed<DomainListRow[]>(() => this.domains().map((domain) => this.toRow(domain)));

  selectedRows = signal<DomainListRow[]>([]);
  applyingBulk = signal(false);
  readonly selectedCount = computed(() => this.selectedRows().length);

  readonly bulkActionOptions = computed<BulkActionOption[]>(() => {
    const labels = this.uiText();
    return [
      {label: labels.bulkActivate, value: 'activate', icon: 'pi pi-check-circle'},
      {label: labels.bulkDeactivate, value: 'deactivate', icon: 'pi pi-times-circle'},
      {label: labels.bulkDelete, value: 'delete', icon: 'pi pi-trash', danger: true},
    ];
  });

  rows = 10;

  getDTDto(d: DomainReadDto): DomainTranslationDto {
    return <DomainTranslationDto>selectTranslation<DomainTranslationDto>(
      d.translations as unknown as Record<string, DomainTranslationDto>,
      this.currentLang(),
    );
  }

  getName(d: DomainReadDto): string {
    const t = this.getDTDto(d);
    return t?.name ?? '';
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.domainService.list({search: this.q() || undefined}).subscribe({
      next: (domains) => {
        this.domains.set(domains);
      },
      error: (err: unknown) => {
        logApiError('domain.list.load', err);
        this.domains.set([]);
      }
    });
  }

  onSearchChange(term: string) {
    this.q.set(term);
    this.load();
  }

  goNew() {
    this.domainService.goNew();
  }

  goEdit(id: number) {
    this.domainService.goEdit(id);
  }

  goDelete(id: number) {
    this.domainService.goDelete(id);
  }

  goJoinRequests(id: number): void {
    void this.router.navigate(['/domain', id, 'join-requests']);
  }

  /** Localized label for a domain's join policy (Auto / Owner / Owner+managers). */
  joinPolicyLabel(policy: JoinPolicyEnumDto | undefined): string {
    const labels = this.editorUi().domainForm;
    switch (policy) {
      case JoinPolicyEnumDto.Owner:
        return labels.joinPolicyOwner;
      case JoinPolicyEnumDto.OwnerManagers:
        return labels.joinPolicyOwnerManagers;
      case JoinPolicyEnumDto.Auto:
      default:
        return labels.joinPolicyAuto;
    }
  }

  isAutoPolicy(policy: JoinPolicyEnumDto | undefined): boolean {
    return (policy ?? JoinPolicyEnumDto.Auto) === JoinPolicyEnumDto.Auto;
  }

  onSelectionChange(rows: DomainListRow[]): void {
    this.selectedRows.set(rows);
  }

  applyBulk(action: string): void {
    if (this.selectedCount() === 0 || this.applyingBulk()) {
      return;
    }
    switch (action as BulkAction) {
      case 'activate':
        this.bulkPatch(true);
        return;
      case 'deactivate':
        this.bulkPatch(false);
        return;
      case 'delete':
        this.confirmBulkDelete();
        return;
    }
  }

  private bulkPatch(active: boolean): void {
    const ids = this.selectedRows().map(row => row.id);
    if (!ids.length) {
      return;
    }
    this.applyingBulk.set(true);
    forkJoin(ids.map(id => this.domainService.updatePartial(id, {active}))).subscribe({
      next: () => {
        this.selectedRows.set([]);
        this.load();
      },
      error: (err: unknown) => logApiError('domain.list.bulk-patch', err),
      complete: () => this.applyingBulk.set(false),
    });
  }

  private confirmBulkDelete(): void {
    const ids = this.selectedRows().map(row => row.id);
    if (!ids.length) {
      return;
    }
    const labels = this.uiText();
    this.confirmationService.confirm({
      header: labels.bulkDeleteHeader,
      message: labels.bulkDeleteConfirm(ids.length),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: labels.bulkDelete,
      rejectLabel: labels.bulkConfirmCancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.runBulkDelete(ids),
    });
  }

  private runBulkDelete(ids: number[]): void {
    this.applyingBulk.set(true);
    forkJoin(ids.map(id => this.domainService.delete(id))).subscribe({
      next: () => {
        this.selectedRows.set([]);
        this.load();
      },
      error: (err: unknown) => logApiError('domain.list.bulk-delete', err),
      complete: () => this.applyingBulk.set(false),
    });
  }

  private toRow(domain: DomainReadDto): DomainListRow {
    const domainWithCounts = domain as DomainReadDto & { subjects_count?: number; questions_count?: number };
    return {
      ...domain,
      name: this.getName(domain),
      subjectsCount: domainWithCounts.subjects_count ?? 0,
      questionsCount: domainWithCounts.questions_count ?? 0,
      pendingJoinRequests: domain.pending_join_requests_count ?? 0,
    };
  }
}
