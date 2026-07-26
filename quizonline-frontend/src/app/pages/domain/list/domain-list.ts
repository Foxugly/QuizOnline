import {Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {FormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {debounceTime, finalize, forkJoin, Subject} from 'rxjs';
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
import {StatusBadgeComponent} from '../../../shared/components/status-badge/status-badge';
import {selectTranslation} from '../../../shared/i18n/select-translation';
import {UserService} from '../../../services/user/user';
import {AppToastService} from '../../../shared/toast/app-toast.service';
import {logApiError} from '../../../shared/api/api-errors';
import {plural} from '../../../shared/i18n/format';
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
    StatusBadgeComponent,
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
  private toast = inject(AppToastService);
  private destroyRef = inject(DestroyRef);

  // Search box keystrokes feed this subject; a 300 ms debounce collapses a
  // burst of keystrokes into a single backend list() call (was one call PER
  // keystroke).
  private readonly searchDebounce$ = new Subject<void>();

  readonly editorUi = inject(UiTextService).editor;
  readonly ui = inject(UiTextService).ui;
  readonly uiText = inject(UiTextService).localized(getDomainListUiText);
  domains = signal<DomainReadDto[]>([]);
  // True when the last load() failed. Kept distinct from "empty list" so the
  // template can show a real error + retry instead of the empty-state.
  loadError = signal(false);
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

  protected bulkSelectedText(n: number): string {
    return plural(this.uiText().bulkSelectedCount, n);
  }

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
    this.searchDebounce$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
    this.load();
  }

  load() {
    this.loadError.set(false);
    this.domainService.list({search: this.q() || undefined}).subscribe({
      next: (domains) => {
        this.domains.set(domains);
      },
      error: (err: unknown) => {
        logApiError('domain.list.load', err);
        // Do NOT clear the list to [] — that renders as "no domains" and hides
        // the failure. Flag the error so the template shows a retry instead.
        this.loadError.set(true);
      }
    });
  }

  onSearchChange(term: string) {
    this.q.set(term);
    this.searchDebounce$.next();
  }

  goNew() {
    this.domainService.goNew();
  }

  goEdit(id: number) {
    this.domainService.goEdit(id);
  }

  goSubscription(id: number) {
    void this.router.navigate(['/domain', id, 'subscription']);
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
    forkJoin(ids.map(id => this.domainService.updatePartial(id, {active})))
      .pipe(finalize(() => this.applyingBulk.set(false)))
      .subscribe({
        next: () => {
          this.selectedRows.set([]);
          this.load();
        },
        error: (err: unknown) => {
          logApiError('domain.list.bulk-patch', err);
          this.toast.addApiError(err, this.uiText().bulkErrorToast);
        },
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
      message: plural(labels.bulkDeleteConfirm, ids.length),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: labels.bulkDelete,
      rejectLabel: labels.bulkConfirmCancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.runBulkDelete(ids),
    });
  }

  private runBulkDelete(ids: number[]): void {
    this.applyingBulk.set(true);
    forkJoin(ids.map(id => this.domainService.delete(id)))
      .pipe(finalize(() => this.applyingBulk.set(false)))
      .subscribe({
        next: () => {
          this.selectedRows.set([]);
          this.load();
        },
        error: (err: unknown) => {
          logApiError('domain.list.bulk-delete', err);
          this.toast.addApiError(err, this.uiText().bulkErrorToast);
        },
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
