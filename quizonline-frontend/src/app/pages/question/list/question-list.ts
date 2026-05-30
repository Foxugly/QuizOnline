import {CommonModule} from '@angular/common';
import {Component, computed, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {forkJoin} from 'rxjs';

import {ButtonModule} from 'primeng/button';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {InputTextModule} from 'primeng/inputtext';
import {MultiSelectModule} from 'primeng/multiselect';
import {SelectModule} from 'primeng/select';
import {CheckboxModule} from 'primeng/checkbox';
import {TableLazyLoadEvent, TableModule} from 'primeng/table';
import {TooltipModule} from 'primeng/tooltip';
import {ConfirmationService} from 'primeng/api';

import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {PatchedQuestionPartialWritePayloadRequestDto} from '../../../api/generated/model/patched-question-partial-write-payload-request';
import {QuestionReadDto} from '../../../api/generated/model/question-read';
import {SubjectReadDto} from '../../../api/generated/model/subject-read';
import {QuestionPreviewDialogComponent} from '../../../components/question-preview-dialog/question-preview-dialog';
import {QuestionService} from '../../../services/question/question';
import {SubjectService} from '../../../services/subject/subject';
import {UserService} from '../../../services/user/user';
import {logApiError} from '../../../shared/api/api-errors';
import {BulkActionsComponent} from '../../../shared/components/bulk-actions/bulk-actions';
import {selectTranslation} from '../../../shared/i18n/select-translation';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {getQuestionListUiText} from './question-list.i18n';

type BulkAction =
  | 'export'
  | 'activate'
  | 'deactivate'
  | 'addPractice'
  | 'removePractice'
  | 'addExam'
  | 'removeExam'
  | 'delete';

type QuestionListRow = {
  id: number;
  question: QuestionReadDto;
  title: string;
  active: boolean;
  modesText: string;
  subjectsText: string;
  subjectIds: number[];
};

@Component({
  selector: 'app-question-list',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CheckboxModule,
    ConfirmDialogModule,
    InputTextModule,
    MultiSelectModule,
    SelectModule,
    TableModule,
    TooltipModule,
    BulkActionsComponent,
    QuestionPreviewDialogComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './question-list.html',
  styleUrl: './question-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionList implements OnInit {
  readonly text = inject(UiTextService).localized(getQuestionListUiText);
  readonly editorUi = inject(UiTextService).editor;
  totalRecords = signal(0);
  rows = signal(10);
  first = signal(0);
  selectingAll = signal(false);

  questions = signal<QuestionReadDto[]>([]);
  subjects = signal<SubjectReadDto[]>([]);
  currentLang = signal<LanguageEnumDto>(LanguageEnumDto.En);
  q = signal('');
  selectedSubjectIds = signal<number[]>([]);
  previewQuestionId = signal<number | null>(null);
  selectedRows = signal<QuestionListRow[]>([]);
  applyingBulk = signal(false);

  private questionService = inject(QuestionService);
  private subjectService = inject(SubjectService);
  private userService: UserService = inject(UserService);
  private confirmationService = inject(ConfirmationService);

  readonly subjectOptions = computed<Array<{ label: string; value: number }>>(() => {
    return this.subjects().map((subject) => ({
      label: this.getSubjectTitle(subject),
      value: subject.id,
    }));
  });

  readonly rowsData = computed<QuestionListRow[]>(() => {
    return this.questions().map((question) => this.toRow(question));
  });

  readonly selectedCount = computed(() => this.selectedRows().length);
  readonly allFilteredSelected = computed(() => this.totalRecords() > 0 && this.selectedRows().length === this.totalRecords());
  readonly someFilteredSelected = computed(() => this.selectedRows().length > 0 && !this.allFilteredSelected());

  readonly bulkActionOptions = computed<{label: string; value: BulkAction; icon?: string; danger?: boolean}[]>(() => {
    const t = this.text();
    return [
      {label: t.bulkExport, value: 'export', icon: 'pi pi-upload'},
      {label: t.bulkActivate, value: 'activate', icon: 'pi pi-check-circle'},
      {label: t.bulkDeactivate, value: 'deactivate', icon: 'pi pi-times-circle'},
      {label: t.bulkAddPractice, value: 'addPractice', icon: 'pi pi-plus-circle'},
      {label: t.bulkRemovePractice, value: 'removePractice', icon: 'pi pi-minus-circle'},
      {label: t.bulkAddExam, value: 'addExam', icon: 'pi pi-plus-circle'},
      {label: t.bulkRemoveExam, value: 'removeExam', icon: 'pi pi-minus-circle'},
      {label: t.bulkDelete, value: 'delete', icon: 'pi pi-trash', danger: true},
    ];
  });


  ngOnInit() {
    this.currentLang.set(this.userService.currentLang ?? LanguageEnumDto.En);
    this.loadSubjects();
    this.loadQuestions(1);
  }

  loadSubjects(): void {
    const currentDomainId = this.userService.currentUser()?.current_domain ?? undefined;
    this.subjectService.list({
      domainId: currentDomainId ?? undefined,
      active: true,
    }).subscribe({
      next: (subjects) => {
        this.subjects.set(subjects);
      },
      error: (err: unknown) => {
        logApiError('question.list.subjects', err);
        this.subjects.set([]);
      }
    });
  }

  loadQuestions(page: number): void {
    const currentDomainId = this.userService.currentUser()?.current_domain ?? undefined;
    this.questionService.listPage({
      search: this.q() || undefined,
      subjectIds: this.selectedSubjectIds(),
      domainId: currentDomainId ?? undefined,
      page,
      pageSize: this.rows(),
    }).subscribe({
      next: (questions) => {
        this.questions.set(questions.results ?? []);
        this.totalRecords.set(questions.count ?? 0);
      },
      error: (err: unknown) => {
        logApiError('question.list.load', err);
        this.questions.set([]);
        this.totalRecords.set(0);
      }
    });
  }

  onSearchChange(term: string) {
    this.q.set(term);
    this.first.set(0);
    this.selectedRows.set([]);
    this.loadQuestions(1);
  }

  onSubjectsChange(ids: number[] | null | undefined): void {
    this.selectedSubjectIds.set(ids ?? []);
    this.first.set(0);
    this.selectedRows.set([]);
    this.loadQuestions(1);
  }

  onSelectionChange(rows: QuestionListRow[]): void {
    this.selectedRows.set(rows);
  }

  toggleSelectAllFiltered(checked: boolean): void {
    if (!checked) {
      this.selectedRows.set([]);
      return;
    }

    const currentDomainId = this.userService.currentUser()?.current_domain ?? undefined;
    this.selectingAll.set(true);
    this.questionService.list({
      search: this.q() || undefined,
      subjectIds: this.selectedSubjectIds(),
      domainId: currentDomainId ?? undefined,
    }).subscribe({
      next: (questions) => {
        this.selectedRows.set((questions ?? []).map((question) => this.toRow(question)));
      },
      error: (err: unknown) => {
        logApiError('question.list.select-all', err);
        this.selectingAll.set(false);
      },
      complete: () => this.selectingAll.set(false),
    });
  }

  goNew(): void {
    this.questionService.goNew();
  }

  goImport(): void {
    this.questionService.goImport();
  }

  exportRows(): void {
    const currentDomainId = this.userService.currentUser()?.current_domain ?? undefined;
    const selected = this.selectedRows();
    if (!currentDomainId || !selected.length) {
      return;
    }

    const questionIds = selected.map(row => row.id);
    this.questionService.exportStructured(currentDomainId, questionIds).subscribe({
      next: ({blob, filename}) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: (err: unknown) => {
        logApiError('question.list.export', err);
      },
    });
  }

  applyBulkAction(action: string): void {
    if (this.selectedCount() === 0 || this.applyingBulk()) {
      return;
    }

    switch (action as BulkAction) {
      case 'export':
        this.exportRows();
        return;
      case 'activate':
        this.bulkPatch({active: true});
        return;
      case 'deactivate':
        this.bulkPatch({active: false});
        return;
      case 'addPractice':
        this.bulkPatch({is_mode_practice: true});
        return;
      case 'removePractice':
        this.bulkPatch({is_mode_practice: false});
        return;
      case 'addExam':
        this.bulkPatch({is_mode_exam: true});
        return;
      case 'removeExam':
        this.bulkPatch({is_mode_exam: false});
        return;
      case 'delete':
        this.bulkDelete();
        return;
    }
  }

  private bulkPatch(payload: PatchedQuestionPartialWritePayloadRequestDto): void {
    const ids = this.selectedRows().map(row => row.id);
    if (!ids.length) {
      return;
    }

    this.applyingBulk.set(true);
    forkJoin(ids.map(id => this.questionService.updatePartial(id, payload))).subscribe({
      next: () => {
        this.selectedRows.set([]);
        this.loadQuestions(this.currentPage());
      },
      error: (err: unknown) => {
        logApiError('question.list.bulk-patch', err);
      },
      complete: () => this.applyingBulk.set(false),
    });
  }

  private bulkDelete(): void {
    const ids = this.selectedRows().map(row => row.id);
    if (!ids.length) {
      return;
    }

    const t = this.text();
    this.confirmationService.confirm({
      message: t.bulkDeleteConfirm(ids.length),
      header: t.bulkDelete,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: t.bulkDelete,
      rejectLabel: t.bulkConfirmCancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.runBulkDelete(ids),
    });
  }

  private runBulkDelete(ids: number[]): void {
    this.applyingBulk.set(true);
    forkJoin(ids.map(id => this.questionService.delete(id))).subscribe({
      next: () => {
        this.selectedRows.set([]);
        this.first.set(0);
        this.loadQuestions(1);
      },
      error: (err: unknown) => {
        logApiError('question.list.bulk-delete', err);
      },
      complete: () => this.applyingBulk.set(false),
    });
  }

  private currentPage(): number {
    const rows = this.rows();
    if (!rows) {
      return 1;
    }
    return Math.floor(this.first() / rows) + 1;
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    const nextFirst = event.first ?? 0;
    const nextRows = event.rows ?? this.rows();
    const nextPage = Math.floor(nextFirst / nextRows) + 1;

    this.first.set(nextFirst);
    this.rows.set(nextRows);
    this.loadQuestions(nextPage);
  }

  goView(id: number): void {
    this.previewQuestionId.set(id);
  }

  closePreview(): void {
    this.previewQuestionId.set(null);
  }

  goEdit(id: number): void {
    this.questionService.goEdit(id);
  }

  goDelete(id: number): void {
    this.questionService.goDelete(id);
  }

  goSubject(id: number): void {
    this.questionService.goSubjectEdit(id);
  }

  getTitle(dto: QuestionReadDto): string {
    const tr = dto.translations as Record<string, { title?: string }>;
    const lang = String(this.currentLang()).toLowerCase();
    return tr?.[lang]?.title ?? `Question #${dto.id}`;
  }

  getModes(dto: QuestionReadDto): string[] {
    const modes: string[] = [];
    if (dto.is_mode_practice) {
      modes.push(this.text().practice);
    }
    if (dto.is_mode_exam) {
      modes.push(this.text().exam);
    }
    return modes;
  }

  getSubjectTitle(dto: SubjectReadDto): string {
    const t = selectTranslation<{ name: string }>(
      dto.translations as Record<string, { name: string }>,
      this.currentLang(),
    );
    return t?.name ?? `Subject #${dto.id}`;
  }

  private toRow(question: QuestionReadDto): QuestionListRow {
    return {
      id: question.id,
      question,
      title: this.getTitle(question),
      active: !!question.active,
      modesText: this.getModes(question).join(', '),
      subjectsText: (question.subjects ?? []).map((subject) => this.getSubjectTitle(subject)).join(', '),
      subjectIds: (question.subjects ?? []).map((subject) => subject.id),
    };
  }
}
