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
import {BadgeModule} from 'primeng/badge';
import {ConfirmationService} from 'primeng/api';
import {DomainReadDto} from '../../../api/generated/model/domain-read';
import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {DomainService, DomainTranslationDto} from '../../../services/domain/domain';
import {StripPPipe} from '../../../shared/pipes/strip-p.pipe';
import {BulkActionsComponent, BulkActionOption} from '../../../shared/components/bulk-actions/bulk-actions';
import {selectTranslation} from '../../../shared/i18n/select-translation';
import {UserService} from '../../../services/user/user';
import {logApiError} from '../../../shared/api/api-errors';

type BulkAction = 'activate' | 'deactivate' | 'delete';

type LangCode = `${LanguageEnumDto}`;
type DomainListRow = DomainReadDto & {
  name: string;
  description: string;
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
    BadgeModule,
    BulkActionsComponent,
    StripPPipe,
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
  domains = signal<DomainReadDto[]>([]);
  q = signal('');
  currentLang = computed(() => this.userService.currentLang);
  rowsData = computed<DomainListRow[]>(() => this.domains().map((domain) => this.toRow(domain)));

  selectedRows = signal<DomainListRow[]>([]);
  applyingBulk = signal(false);
  readonly selectedCount = computed(() => this.selectedRows().length);

  readonly bulkActionOptions = computed<BulkActionOption[]>(() => [
    {label: 'Rendre actif', value: 'activate', icon: 'pi pi-check-circle'},
    {label: 'Rendre inactif', value: 'deactivate', icon: 'pi pi-times-circle'},
    {label: 'Supprimer', value: 'delete', icon: 'pi pi-trash', danger: true},
  ]);

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

  getDescription(d: DomainReadDto): string {
    const t = this.getDTDto(d);
    return t?.description ?? '';
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
    const plural = ids.length > 1 ? 's' : '';
    this.confirmationService.confirm({
      header: 'Supprimer',
      message: `Supprimer ${ids.length} domaine${plural} ? Cette action est irréversible.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
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
      description: this.getDescription(domain),
      subjectsCount: domainWithCounts.subjects_count ?? 0,
      questionsCount: domainWithCounts.questions_count ?? 0,
      pendingJoinRequests: domain.pending_join_requests_count ?? 0,
    };
  }
}
