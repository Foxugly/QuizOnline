import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal} from '@angular/core';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {ActivatedRoute} from '@angular/router';
import {NonNullableFormBuilder, ReactiveFormsModule} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {firstValueFrom, forkJoin} from 'rxjs';
import {finalize} from 'rxjs/operators';

import {ButtonModule} from 'primeng/button';
import {TooltipModule} from 'primeng/tooltip';
import {DomainReadDto} from '../../../api/generated/model/domain-read';
import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {QuestionReadDto} from '../../../api/generated/model/question-read';
import {SubjectReadDto} from '../../../api/generated/model/subject-read';
import {QuestionEditorFormComponent} from '../../../components/question-editor-form/question-editor-form';
import {AnswerRowVm, QuestionBlockTabs} from '../../../components/question-editor-form/question-block-tabs';
import {QuestionPreviewDialogComponent} from '../../../components/question-preview-dialog/question-preview-dialog';
import {
  addQuestionAnswerOption,
  buildQuestionCreatePayload,
  buildQuestionPatchPayload,
  clearQuestionTranslationTab,
  createQuestionEditorForm,
  getAnswerOptions,
  getQuestionCorrectCount,
  isQuestionEditorFormValid,
  populateQuestionEditorForm,
  QuestionEditorForm,
} from '../../../services/question/question-editor-form';
import {QuestionService} from '../../../services/question/question';
import {SubjectService} from '../../../services/subject/subject';
import {LangCode} from '../../../services/translation/translation';
import {UserService} from '../../../services/user/user';
import {ContentBlock} from '../../../shared/learning/content-block.types';
import {logApiError} from '../../../shared/api/api-errors';
import {AppToastService} from '../../../shared/toast/app-toast.service';
import {selectTranslation} from '../../../shared/i18n/select-translation';

/**
 * ``/question/<id>/edit`` page (Phase 3.5).
 *
 * Layout:
 * 1. ``<app-question-editor-form>`` — the context card on top
 *    (domain, subjects, mode flags, per-language title, media). Saved
 *    via ``PATCH /api/question/<id>/``.
 * 2. ``<app-question-block-tabs>`` — the 3-tab block editor below
 *    (Question / Réponses / Explication). Each tab embeds an
 *    ``<app-block-list-editor>`` that calls ``/api/block/`` directly,
 *    so block-level changes are persisted independently of the
 *    metadata form.
 *
 * The page reloads the full question after every block-level change
 * (add / patch / delete / reorder) so the block lists stay in sync
 * with what the backend just persisted. Block-level edits don't need
 * the user to click "Save" — only the meta card does.
 */
@Component({
  selector: 'app-question-edit',
  templateUrl: './question-edit.html',
  styleUrl: './question-edit.scss',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    QuestionEditorFormComponent,
    QuestionBlockTabs,
    QuestionPreviewDialogComponent,
    TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionEdit implements OnInit {
  readonly ui = inject(UiTextService).editor;
  id!: number;

  loading = signal(true);
  saving = signal(false);
  deleting = signal(false);
  error = signal<string | null>(null);
  submitError = signal<string | null>(null);
  success = signal<string | null>(null);

  question = signal<QuestionReadDto | null>(null);
  subjects = signal<SubjectReadDto[]>([]);
  domainLangs = signal<LangCode[]>([]);
  activeLang = signal<LangCode | null>(null);
  currentLang = signal<LanguageEnumDto>(LanguageEnumDto.Fr);

  /** Prompt blocks, kept locally so block-level reloads don't have
   *  to traverse the question signal each time. */
  protected readonly promptBlocks = signal<ContentBlock[]>([]);
  protected readonly explanationBlocks = signal<ContentBlock[]>([]);
  protected readonly answerRows = signal<AnswerRowVm[]>([]);
  /** Drives the visibility of ``<app-question-preview-dialog>`` — a
   *  modal that renders the question as a learner would see it via the
   *  shared ``<app-block-card>`` stack, reusing the production
   *  ``QuizQuestionComponent``. */
  protected readonly previewVisible = signal(false);

  protected openPreview(): void {
    this.previewVisible.set(true);
  }

  protected onPreviewVisibleChange(visible: boolean): void {
    this.previewVisible.set(visible);
  }

  private fb = inject(NonNullableFormBuilder);
  form: QuestionEditorForm = createQuestionEditorForm(this.fb, {domainDisabled: true});

  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private questionService = inject(QuestionService);
  private subjectService = inject(SubjectService);
  private userService = inject(UserService);
  private toast = inject(AppToastService);

  readonly filteredSubjects = computed(() => {
    const domainId = this.question()?.domain.id;
    if (!domainId) {
      return [];
    }
    return this.subjects().filter((subject) => subject.domain === domainId);
  });

  readonly subjectOptions = computed<Array<{name: string; code: number}>>(() => {
    const lang = this.currentLang();
    return this.filteredSubjects().map((subject) => {
      const translation = selectTranslation<{name: string}>(
        subject.translations as Record<string, {name: string}>,
        lang,
      );
      return {
        name: translation?.name ?? `Subject #${subject.id}`,
        code: subject.id,
      };
    });
  });

  protected readonly domainId = computed(() => this.question()?.domain.id ?? 0);

  ngOnInit(): void {
    this.currentLang.set(this.userService.currentLang ?? LanguageEnumDto.Fr);

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const nextId = Number(
          params.get('questionId') ??
          params.get('id'),
        );

        if (!nextId || Number.isNaN(nextId)) {
          this.loading.set(false);
          this.error.set(this.ui().pages.questionEdit.errors.invalidId);
          return;
        }

        this.id = nextId;
        this.loadData();
      });
  }

  tabCodes(): LangCode[] {
    return this.domainLangs();
  }

  onTabChange(value: string | number | undefined): void {
    if (value === undefined || value === null) {
      return;
    }
    const code = String(value) as LangCode;
    if (!this.domainLangs().includes(code)) {
      return;
    }
    this.activeLang.set(code);
  }

  goBack(): void {
    this.questionService.goBack();
  }

  goView(questionId: number): void {
    this.questionService.goView(questionId);
  }

  duplicateQuestion(): void {
    if (this.saving() || this.deleting()) {
      return;
    }

    void this.createDuplicateQuestion();
  }

  clearActiveTab(): void {
    const lang = this.activeLang();
    if (!lang) {
      return;
    }
    clearQuestionTranslationTab(this.form, lang);
  }

  async deleteQuestion(): Promise<void> {
    const errors = this.ui().pages.questionEdit.errors;
    this.error.set(null);
    this.submitError.set(null);
    this.success.set(null);

    const confirmed = window.confirm(errors.confirmDelete);
    if (!confirmed) {
      return;
    }

    this.deleting.set(true);

    try {
      await firstValueFrom(this.questionService.delete(this.id));
      this.questionService.goList();
    } catch (err: any) {
      if (err?.error && typeof err.error === 'object') {
        this.submitError.set(JSON.stringify(err.error));
      } else {
        this.submitError.set(errors.deleteFailed);
      }
    } finally {
      this.deleting.set(false);
    }
  }

  async save(): Promise<void> {
    const errors = this.ui().pages.questionEdit.errors;
    this.error.set(null);
    this.submitError.set(null);
    this.success.set(null);

    if (!isQuestionEditorFormValid(this.form, this.domainLangs())) {
      this.submitError.set(errors.formInvalid);
      this.form.markAllAsTouched();
      return;
    }

    if (getQuestionCorrectCount(this.form) === 0) {
      this.submitError.set(errors.needOneCorrect);
      return;
    }

    this.saving.set(true);

    try {
      const payload = buildQuestionPatchPayload(this.form, this.domainLangs());

      const updated = await firstValueFrom(this.questionService.updatePartial(this.id, payload));
      this.question.set(updated);
      this.refreshBlockSignals(updated);

      this.success.set(errors.saveSuccess);
      this.toast.add({severity: 'success', summary: errors.saveSuccess});
    } catch (err: any) {
      if (err?.error && typeof err.error === 'object') {
        this.submitError.set(JSON.stringify(err.error));
      } else {
        this.submitError.set(errors.saveFailed);
      }
    } finally {
      this.saving.set(false);
    }
  }

  getDomainLabel(domain: DomainReadDto): string {
    const label = selectTranslation<{name: string}>(
      domain.translations as Record<string, {name: string}>,
      this.currentLang(),
    );
    return label?.name ?? `Domain #${domain.id}`;
  }

  protected onBlocksChanged(): void {
    // A block-list editor reported a mutation — refetch the question
    // so every dependent signal (the affected list, the outline, the
    // preview if any) picks up the new server state.
    this.questionService.retrieve(this.id).subscribe({
      next: (question) => {
        this.question.set(question);
        this.refreshBlockSignals(question);
      },
      error: (err: unknown) => {
        logApiError('question.edit.refresh', err);
      },
    });
  }

  /** Toggle the ``is_correct`` flag on a single answer option and
   *  persist it. The reactive form mirrors the change so the parent
   *  validation rule (at least one correct answer on save) still
   *  sees the right count. */
  protected onCorrectChanged(event: {answerId: number; isCorrect: boolean}): void {
    const rows = this.answerRows();
    const next = rows.map((row) =>
      row.id === event.answerId ? {...row, is_correct: event.isCorrect} : row,
    );
    this.answerRows.set(next);

    // Sync the FormArray so getQuestionCorrectCount() stays accurate
    // when the user eventually clicks "Save".
    const meta = getAnswerOptions(this.form).controls.find(
      (ctrl) => Number(ctrl.get('id')?.value) === event.answerId,
    );
    meta?.get('is_correct')?.setValue(event.isCorrect);

    // Persist by patching the question with the new answer list.
    const payload = buildQuestionPatchPayload(this.form, this.domainLangs());
    this.questionService.updatePartial(this.id, payload).subscribe({
      next: (question) => {
        this.question.set(question);
        this.refreshBlockSignals(question);
      },
      error: (err: unknown) => {
        logApiError('question.edit.correct-toggle', err);
        this.toast.addApiError(err, this.ui().pages.questionEdit.errors.saveFailed);
      },
    });
  }

  /** Add a fresh AnswerOption row by sending a question PATCH with
   *  the new list (the simplest way to insert into the M2M-like
   *  list without exposing a dedicated endpoint). */
  protected onAddAnswer(): void {
    addQuestionAnswerOption(this.fb, this.form, this.domainLangs());
    const payload = buildQuestionPatchPayload(this.form, this.domainLangs());
    this.questionService.updatePartial(this.id, payload).subscribe({
      next: (question) => {
        this.question.set(question);
        this.refreshBlockSignals(question);
      },
      error: (err: unknown) => {
        logApiError('question.edit.add-answer', err);
        this.toast.addApiError(err, this.ui().pages.questionEdit.errors.saveFailed);
      },
    });
  }

  /** Duplicate an AnswerOption: clones the source row's ``is_correct``
   *  flag into a fresh row appended at the end of the list, then
   *  PATCHes the question. Blocks are NOT carried over yet — the
   *  author can re-author them in the new row (a future bulk-clone
   *  endpoint on the backend would let us deep-copy automatically). */
  protected onDuplicateAnswer(answerId: number): void {
    const controls = getAnswerOptions(this.form).controls;
    const sourceCtrl = controls.find((ctrl) => Number(ctrl.get('id')?.value) === answerId);
    if (!sourceCtrl) {
      return;
    }
    const isCorrect = !!sourceCtrl.get('is_correct')?.value;
    addQuestionAnswerOption(this.fb, this.form, this.domainLangs());
    const all = getAnswerOptions(this.form).controls;
    all[all.length - 1].get('is_correct')?.setValue(isCorrect);
    const payload = buildQuestionPatchPayload(this.form, this.domainLangs());
    this.questionService.updatePartial(this.id, payload).subscribe({
      next: (question) => {
        this.question.set(question);
        this.refreshBlockSignals(question);
      },
      error: (err: unknown) => {
        logApiError('question.edit.duplicate-answer', err);
        this.toast.addApiError(err, this.ui().pages.questionEdit.errors.saveFailed);
      },
    });
  }

  /** Remove an AnswerOption by id. Like ``onAddAnswer`` we patch the
   *  question with the trimmed list so all the cascading deletes
   *  (Block rows on the option, sort_order updates) happen
   *  transactionally on the backend. */
  protected onRemoveAnswer(answerId: number): void {
    // Drop the row from the form and from the local rows signal so
    // the patch payload reflects the new state.
    const controls = getAnswerOptions(this.form).controls;
    const idx = controls.findIndex((ctrl) => Number(ctrl.get('id')?.value) === answerId);
    if (idx === -1) {
      return;
    }
    getAnswerOptions(this.form).removeAt(idx);
    // Renumber sort_orders to match.
    getAnswerOptions(this.form).controls.forEach((ctrl, i) => {
      ctrl.get('sort_order')?.setValue(i + 1);
    });

    const payload = buildQuestionPatchPayload(this.form, this.domainLangs());
    this.questionService.updatePartial(this.id, payload).subscribe({
      next: (question) => {
        this.question.set(question);
        this.refreshBlockSignals(question);
      },
      error: (err: unknown) => {
        logApiError('question.edit.remove-answer', err);
        this.toast.addApiError(err, this.ui().pages.questionEdit.errors.saveFailed);
      },
    });
  }

  private loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.submitError.set(null);
    this.success.set(null);
    this.question.set(null);
    this.domainLangs.set([]);
    this.activeLang.set(null);

    forkJoin({
      subjects: this.subjectService.list(),
      question: this.questionService.retrieve(this.id),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({subjects, question}) => {
          this.subjects.set(subjects ?? []);
          this.question.set(question);
          const langs = populateQuestionEditorForm(this.fb, this.form, question);
          this.domainLangs.set(langs);
          this.activeLang.set(langs[0] ?? null);
          this.refreshBlockSignals(question);
        },
        error: () => {
          this.error.set(this.ui().pages.questionEdit.errors.loadFailed);
        },
      });
  }

  /** Repopulate the block-related signals from a freshly-fetched
   *  question payload. Called after every successful question
   *  read (initial load + every refetch triggered by block-level
   *  mutations from the embedded editors). */
  private refreshBlockSignals(question: QuestionReadDto): void {
    this.promptBlocks.set((question.prompt_blocks ?? []) as unknown as ContentBlock[]);
    this.explanationBlocks.set((question.explanation_blocks ?? []) as unknown as ContentBlock[]);
    this.answerRows.set(
      (question.answer_options ?? []).map((opt) => ({
        id: opt.id,
        is_correct: !!opt.is_correct,
        sort_order: opt.sort_order ?? opt.id,
        blocks: ((opt as unknown as {blocks?: ContentBlock[]}).blocks ?? []) as ContentBlock[],
      })),
    );
  }

  private async createDuplicateQuestion(): Promise<void> {
    const errors = this.ui().pages.questionEdit.errors;
    this.error.set(null);
    this.submitError.set(null);
    this.success.set(null);

    if (!isQuestionEditorFormValid(this.form, this.domainLangs())) {
      this.submitError.set(errors.formInvalid);
      this.form.markAllAsTouched();
      return;
    }

    if (getQuestionCorrectCount(this.form) === 0) {
      this.submitError.set(errors.needOneCorrect);
      return;
    }

    this.saving.set(true);

    try {
      const payload = buildQuestionCreatePayload(this.form, this.domainLangs());

      payload.answer_options = (payload.answer_options ?? []).map((answer) => ({
        is_correct: answer.is_correct,
        sort_order: answer.sort_order,
      }));

      payload.translations = Object.fromEntries(
        Object.entries(payload.translations ?? {}).map(([lang, value]) => [
          lang,
          {
            ...value,
            title: value?.title?.trim() ? `${value.title} (copy)` : '(copy)',
          },
        ]),
      );

      const created = await firstValueFrom(this.questionService.create(payload));
      this.questionService.goEdit(created.id);
    } catch (err: any) {
      if (err?.error && typeof err.error === 'object') {
        this.submitError.set(JSON.stringify(err.error));
      } else {
        this.submitError.set(this.ui().pages.questionEdit.errors.duplicateFailed);
      }
    } finally {
      this.saving.set(false);
    }
  }
}
