import {Component, computed, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {FormsModule} from '@angular/forms';
import {forkJoin} from 'rxjs';
import {SubjectService, SubjectTranslationDto} from '../../../services/subject/subject';
import {ButtonModule} from 'primeng/button';
import {CheckboxModule} from 'primeng/checkbox';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {InputTextModule} from 'primeng/inputtext';
import {PaginatorModule} from 'primeng/paginator';
import {TableModule} from 'primeng/table';
import {TooltipModule} from 'primeng/tooltip';
import {ConfirmationService} from 'primeng/api';
import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {SubjectDetailDto} from '../../../api/generated/model/subject-detail';
import {SubjectReadDto} from '../../../api/generated/model/subject-read';
import {BulkActionsComponent, BulkActionOption} from '../../../shared/components/bulk-actions/bulk-actions';
import {TableSkeleton} from '../../../shared/components/loading-skeleton/table-skeleton';
import {selectTranslation } from '../../../shared/i18n/select-translation';
import {UserService} from '../../../services/user/user';
import {DomainService} from '../../../services/domain/domain';
import {logApiError} from '../../../shared/api/api-errors';
import {getSubjectListUiText} from './subject-list.i18n';

type BulkAction = 'activate' | 'deactivate' | 'delete';

type SubjectListRow = SubjectReadDto & {
  name: string;
  description: string;
  domainName: string;
  questionsCount: number;
};

@Component({
  selector: 'app-subject-list',
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    ConfirmDialogModule,
    InputTextModule,
    PaginatorModule,
    TableModule,
    TooltipModule,
    BulkActionsComponent,
    TableSkeleton,
  ],
  providers: [ConfirmationService],
  templateUrl: './subject-list.html',
  styleUrl: './subject-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjectList implements OnInit {
  private subjectService: SubjectService = inject(SubjectService);
  private userService: UserService = inject(UserService);
  private domainService: DomainService = inject(DomainService);
  private confirmationService = inject(ConfirmationService);

  readonly editorUi = inject(UiTextService).editor;
  readonly pageText = inject(UiTextService).localized(getSubjectListUiText);
  subjects = signal<SubjectReadDto[]>([]);
  questionCounts = signal<Record<number, number>>({});
  initialLoad = signal<boolean>(true);
  q = signal('');
  currentLang = computed((): LanguageEnumDto => this.userService.currentLang);
  rowsData = computed<SubjectListRow[]>(() => this.subjects().map((subject) => this.toRow(subject)));

  selectedRows = signal<SubjectListRow[]>([]);
  applyingBulk = signal(false);
  readonly selectedCount = computed(() => this.selectedRows().length);

  readonly bulkActionOptions = computed<BulkActionOption[]>(() => {
    const labels = this.editorUi().bulkList;
    return [
      {label: labels.activate, value: 'activate', icon: 'pi pi-check-circle'},
      {label: labels.deactivate, value: 'deactivate', icon: 'pi pi-times-circle'},
      {label: labels.delete, value: 'delete', icon: 'pi pi-trash', danger: true},
    ];
  });

  rows = 10;

  getSTDto(d: SubjectReadDto): SubjectTranslationDto {
    return <SubjectTranslationDto>selectTranslation<SubjectTranslationDto>(
      d.translations as unknown as Record<string, SubjectTranslationDto>,
      this.currentLang(),
    );
  }

  getName(d: SubjectReadDto): string {
    const t = this.getSTDto(d);
    return t?.name ?? '';
  }

  getDescription(d: SubjectReadDto): string {
    const t = this.getSTDto(d);
    return t?.description ?? '';
  }

  getDomain(d: SubjectReadDto): string {
    const t = this.getSTDto(d);
    return t?.domain?.name ?? `Domain #${d.domain}`;
  }

  goDomain(domainId: number): void {
    this.domainService.goEdit(domainId);
  }

  ngOnInit() {
    this.load();
  }

  load() {
    const currentDomainId = this.userService.currentUser()?.current_domain ?? undefined;
    this.subjectService.list({
      search: this.q() || undefined,
      domainId: currentDomainId ?? undefined,
    }).subscribe({
      next: (subjects) => {
        this.subjects.set(subjects);
        this.initialLoad.set(false);

        if (!subjects.length) {
          this.questionCounts.set({});
          return;
        }

        forkJoin(
          subjects.map((subject) => this.subjectService.detail(subject.id)),
        ).subscribe({
          next: (details) => {
            this.questionCounts.set(this.buildSubjectQuestionCounts(details));
          },
          error: (err: unknown) => {
            logApiError('subject.list.counts', err);
            this.questionCounts.set({});
          },
        });
      },
      error: (err: unknown) => {
        logApiError('subject.list.load', err);
        this.subjects.set([]);
        this.questionCounts.set({});
        this.initialLoad.set(false);
      }
    });
  }

  onSearchChange(term: string) {
    this.q.set(term);
    this.load();
  }

  goNew() {
    this.subjectService.goNew();
  }

  goEdit(id: number) {
    this.subjectService.goEdit(id);
  }

  goDelete(id: number) {
    this.subjectService.goDelete(id);
  }

  onSelectionChange(rows: SubjectListRow[]): void {
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
    forkJoin(ids.map(id => this.subjectService.updatePartial(id, {active}))).subscribe({
      next: () => {
        this.selectedRows.set([]);
        this.load();
      },
      error: (err: unknown) => logApiError('subject.list.bulk-patch', err),
      complete: () => this.applyingBulk.set(false),
    });
  }

  private confirmBulkDelete(): void {
    const ids = this.selectedRows().map(row => row.id);
    if (!ids.length) {
      return;
    }
    const labels = this.editorUi().bulkList;
    this.confirmationService.confirm({
      header: labels.confirmDeleteHeader,
      message: labels.confirmDeleteSubjects(ids.length),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: labels.confirmDeleteAccept,
      rejectLabel: labels.confirmDeleteCancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.runBulkDelete(ids),
    });
  }

  private runBulkDelete(ids: number[]): void {
    this.applyingBulk.set(true);
    forkJoin(ids.map(id => this.subjectService.delete(id))).subscribe({
      next: () => {
        this.selectedRows.set([]);
        this.load();
      },
      error: (err: unknown) => logApiError('subject.list.bulk-delete', err),
      complete: () => this.applyingBulk.set(false),
    });
  }

  getQuestionCount(subjectId: number): number {
    return this.questionCounts()[subjectId] ?? 0;
  }

  private buildSubjectQuestionCounts(details: SubjectDetailDto[]): Record<number, number> {
    return details.reduce<Record<number, number>>((counts, detail) => {
      counts[detail.id] = detail.questions?.length ?? 0;
      return counts;
    }, {});
  }

  private toRow(subject: SubjectReadDto): SubjectListRow {
    return {
      ...subject,
      name: this.getName(subject),
      description: this.getDescription(subject),
      domainName: this.getDomain(subject),
      questionsCount: this.getQuestionCount(subject.id),
    };
  }
}
