import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, Injector, OnInit, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormGroup, Validators, NonNullableFormBuilder, ReactiveFormsModule} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {firstValueFrom, forkJoin, of} from 'rxjs';
import {finalize} from 'rxjs/operators';
import {QuizCreateCompositionController} from './quiz-create-composition.controller';
import {QuizCreateTemplateTranslationsController} from './quiz-create-template-translations.controller';

import {Translation} from 'primeng/api';
import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {CheckboxModule} from 'primeng/checkbox';
import {PrimeNG} from 'primeng/config';
import {DatePickerModule} from 'primeng/datepicker';
import {DialogModule} from 'primeng/dialog';
import {EditorModule} from 'primeng/editor';
import {InputNumberModule} from 'primeng/inputnumber';
import {InputTextModule} from 'primeng/inputtext';
import {SelectModule} from 'primeng/select';
import {ToggleSwitchModule} from 'primeng/toggleswitch';
import {TabsModule} from 'primeng/tabs';
import {TextareaModule} from 'primeng/textarea';

import {
  DomainReadDto,
} from '../../../api/generated/model/domain-read';
import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {ModeEnumDto} from '../../../api/generated/model/mode-enum';
import {QuestionInQuizQuestionDto} from '../../../api/generated/model/question-in-quiz-question';
import {QuestionReadDto} from '../../../api/generated/model/question-read';
import {QuizTemplateDto} from '../../../api/generated/model/quiz-template';
import {QuizTemplateWriteRequestDto} from '../../../api/generated/model/quiz-template-write-request';
import {SubjectReadDto} from '../../../api/generated/model/subject-read';
import {VisibilityEnumDto} from '../../../api/generated/model/visibility-enum';
import {QuizQuestionLibraryComponent} from '../../../components/quiz-question-library/quiz-question-library';
import {QuizTemplateCompositionComponent} from '../../../components/quiz-template-composition/quiz-template-composition';
import {QuestionPreviewDialogComponent} from '../../../components/question-preview-dialog/question-preview-dialog';
import {QuestionEditorFormComponent} from '../../../components/question-editor-form/question-editor-form';
import {DomainService} from '../../../services/domain/domain';
import {getLocalizedDomainName} from '../../../shared/i18n/domain-label';
import {QuestionService} from '../../../services/question/question';
import {QuizService} from '../../../services/quiz/quiz';
import {QuizTemplateService} from '../../../services/quiz-template/quiz-template';
import {SubjectService} from '../../../services/subject/subject';
import {LangCode} from '../../../services/translation/translation';
import {UserService} from '../../../services/user/user';
import {DirtyGuardDirective} from '../../../shared/directives/dirty-guard.directive';
import {SavedAtComponent} from '../../../shared/components/saved-at/saved-at';
import {selectTranslation} from '../../../shared/i18n/select-translation';
import {QuestionLibraryCard, SelectedQuestionCard, SelectedQuestionRef} from './quiz-template-builder.models';
import {getQuizCreateUiText} from './quiz-create.i18n';
import {QuizCreateInlineQuestionController} from './quiz-create-inline-question.controller';
import {UiTextService} from '../../../shared/i18n/ui-text.service';

import {QuizTemplateTranslations} from './quiz-create-template-translations.controller';

type QuizTemplateLocalizedDto = QuizTemplateDto & {translations?: QuizTemplateTranslations};
type QuizTemplateLocalizedWriteRequestDto = QuizTemplateWriteRequestDto & {translations?: QuizTemplateTranslations};

@Component({
  selector: 'app-quiz-create',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    DatePickerModule,
    DialogModule,
    EditorModule,
    InputNumberModule,
    InputTextModule,
    QuizQuestionLibraryComponent,
    QuizTemplateCompositionComponent,
    QuestionPreviewDialogComponent,
    QuestionEditorFormComponent,
    SelectModule,
    TabsModule,
    TextareaModule,
    ToggleSwitchModule,
    DirtyGuardDirective,
    SavedAtComponent,
  ],
  templateUrl: './quiz-create.html',
  styleUrl: './quiz-create.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    QuizCreateInlineQuestionController,
    QuizCreateTemplateTranslationsController,
    QuizCreateCompositionController,
  ],
})
export class QuizCreate implements OnInit {

  loading = signal(true);
  questionsLoading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  submitError = signal<string | null>(null);
  readonly lastSavedAt = signal<Date | null>(null);

  /**
   * Inline "create a new question" dialog state + form. Owned by a
   * component-scoped controller so its lifetime is tied to this page.
   */
  protected readonly questionDialog = inject(QuizCreateInlineQuestionController);

  /** Per-language title/description tabs + translate-call orchestration. */
  protected readonly templateTranslations = inject(QuizCreateTemplateTranslationsController);

  /** Working list of picked questions + ordering / weighting bookkeeping. */
  protected readonly composition = inject(QuizCreateCompositionController);

  domains = signal<DomainReadDto[]>([]);
  subjects = signal<SubjectReadDto[]>([]);
  questions = signal<QuestionReadDto[]>([]);
  search = signal('');
  selectedQuestionSubjectIds = signal<number[]>([]);
  activeEditorTab = signal<'texts' | 'configuration' | 'questions'>('texts');
  currentLang = signal<LanguageEnumDto>(LanguageEnumDto.Fr);
  selectedDomainId = signal(0);
  quizFormValid = signal(false);
  editingTemplateId = signal<number | null>(null);
  previewQuestionId = signal<number | null>(null);

  readonly isEditMode = computed(() => this.editingTemplateId() !== null);

  readonly quizForm = inject(NonNullableFormBuilder).group({
    domain: [0, [Validators.required, Validators.min(1)]],
    title: [''],
    description: [''],
    translations: inject(NonNullableFormBuilder).group({}),
    mode: [ModeEnumDto.Practice as ModeEnumDto, Validators.required],
    active: [true],
    is_public: [false],
    permanent: [true],
    shuffle_questions: [false],
    started_at: [null as Date | null],
    ended_at: [null as Date | null],
    with_duration: [false],
    duration: [10, [Validators.required, Validators.min(1)]],
    result_visibility: [VisibilityEnumDto.Immediate as VisibilityEnumDto, Validators.required],
    result_available_at: [null as Date | null],
    detail_visibility: [VisibilityEnumDto.Immediate as VisibilityEnumDto, Validators.required],
    detail_available_at: [null as Date | null],
  });

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly route = inject(ActivatedRoute);
  private readonly primeng = inject(PrimeNG);
  private readonly domainService = inject(DomainService);
  private readonly subjectService = inject(SubjectService);
  private readonly questionService = inject(QuestionService);
  private readonly quizTemplateService = inject(QuizTemplateService);
  private readonly quizService = inject(QuizService);
  private readonly userService = inject(UserService);
  private preserveSelectionOnNextDomainChange = false;

  readonly selectedDomain = computed(() => {
    const domainId = this.selectedDomainId();
    return this.domains().find((domain) => domain.id === domainId) ?? null;
  });

  readonly selectedDomainLabel = computed(() => {
    const domain = this.selectedDomain();
    return domain ? this.getDomainLabel(domain) : null;
  });

  readonly uiText = computed(() => this.getUiText(this.currentLang()));
  readonly editorUi = inject(UiTextService).editor;
  readonly datePickerFormat = computed(() => this.uiText().dateFormat);
  readonly pageTitle = computed(() => this.isEditMode() ? this.uiText().editTitle : this.uiText().createTitle);
  readonly pageSubtitle = computed(() => this.isEditMode() ? this.uiText().editSubtitle : this.uiText().createSubtitle);
  readonly submitLabel = computed(() => this.isEditMode() ? this.uiText().saveTemplate : this.uiText().createTemplate);
  readonly modeOptions = computed(() => [
    {label: this.uiText().practiceMode, value: ModeEnumDto.Practice},
    {label: this.uiText().examMode, value: ModeEnumDto.Exam},
  ]);
  readonly visibilityOptions = computed(() => [
    {label: this.uiText().visibilityImmediate, value: VisibilityEnumDto.Immediate},
    {label: this.uiText().visibilityScheduled, value: VisibilityEnumDto.Scheduled},
    {label: this.uiText().visibilityNever, value: VisibilityEnumDto.Never},
  ]);

  readonly domainOptions = computed(() => this.domains().map((domain) => ({
    label: this.domainLabel(domain),
    value: domain.id,
  })));

  readonly subjectOptions = computed<Array<{name: string; code: number}>>(() => {
    const domainId = this.selectedDomainId();
    const lang = this.currentLang();

    return this.subjects()
      .filter((subject) => subject.domain === domainId)
      .map((subject) => ({
        code: subject.id,
        name: this.getSubjectLabel(subject, lang),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  });

  readonly availableQuestions = computed(() => {
    const selectedIds = new Set(this.composition.selectedQuestions().map((entry) => entry.question.id));
    const term = this.search().trim().toLowerCase();
    const selectedSubjectIds = new Set(this.selectedQuestionSubjectIds());

    return this.questions()
      .filter((question) => !selectedIds.has(question.id))
      .filter((question) => {
        if (selectedSubjectIds.size === 0) {
          return true;
        }
        return question.subjects.some((subject) => selectedSubjectIds.has(subject.id));
      })
      .filter((question) => {
        if (!term) {
          return true;
        }

        const haystack = [
          this.getQuestionTitle(question),
          ...question.subjects.map((subject) => this.getSubjectLabel(subject, this.currentLang())),
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(term);
      });
  });
  readonly availableQuestionCards = computed<QuestionLibraryCard[]>(() =>
    this.availableQuestions().map((question) => ({
      question,
      title: this.getQuestionTitle(question),
      subjectsLabel: this.getQuestionSubjects(question),
    })),
  );
  readonly selectedQuestionCards = computed<SelectedQuestionCard[]>(() =>
    this.composition.selectedQuestions().map((item) => ({
      item,
      questionId: item.question.id,
      title: this.getQuestionTitle(item.question),
      subjectsLabel: this.getQuestionSubjects(item.question),
    })),
  );

  readonly canSave = computed(() => {
    return this.canManageSelectedDomain() &&
      !this.saving() &&
      !!this.selectedDomainId() &&
      this.quizFormValid() &&
      this.templateTranslations.hasTitle() &&
      this.composition.count() > 0;
  });

  readonly canManageSelectedDomain = computed(() => {
    const me = this.userService.currentUser();
    const domain = this.selectedDomain();
    if (!me || !domain) {
      return false;
    }
    if (me.is_superuser) {
      return true;
    }
    return domain.owner?.id === me.id || (domain.managers ?? []).some((user) => user.id === me.id);
  });

  readonly canManageAnyDomain = computed(() => {
    const me = this.userService.currentUser();
    if (!me) {
      return false;
    }
    if (me.is_superuser) {
      return true;
    }
    return this.domains().some((domain) =>
      domain.owner?.id === me.id || (domain.managers ?? []).some((user) => user.id === me.id),
    );
  });

  ngOnInit(): void {
    const rawTemplateId = this.route.snapshot.paramMap.get('templateId');
    const templateId = rawTemplateId ? Number(rawTemplateId) : null;
    if (rawTemplateId && !Number.isFinite(templateId)) {
      this.error.set(this.editorUi().pages.quizCreate.errors.invalidTemplateId);
      this.loading.set(false);
      return;
    }
    this.editingTemplateId.set(templateId);

    this.questionDialog.bind({
      selectedDomain: () => this.selectedDomain(),
      selectedDomainId: () => this.selectedDomainId(),
      onQuestionCreated: (question) => {
        this.questions.update((questions) => [question, ...questions]);
        this.composition.addExisting(question);
      },
      onPageError: (message) => this.submitError.set(message),
      domainRequiredFirstMessage: () => this.editorUi().pages.quizCreate.errors.domainRequiredFirst,
    });

    this.composition.bind({
      onMutated: () => this.submitError.set(null),
    });

    this.templateTranslations.bind({
      getTranslationsGroup: () => this.quizForm.controls.translations as FormGroup,
      currentLang: () => this.currentLang(),
      onLocalizedSync: ({title, description}) => {
        this.quizForm.controls.title.setValue(title, {emitEvent: false});
        this.quizForm.controls.description.setValue(description, {emitEvent: false});
      },
      onPageError: (message) => this.submitError.set(message),
      onTranslationsChanged: () => this.quizFormValid.set(this.quizForm.valid && this.templateTranslations.hasTitle()),
    });

    effect(() => {
      const nextLang = this.userService.lang() as LanguageEnumDto;
      this.currentLang.set(nextLang);
      this.applyDatePickerLocale(nextLang);

      this.templateTranslations.syncActiveLang(nextLang as LangCode);
      this.questionDialog.syncActiveLang(nextLang as LangCode);

      const localized = this.templateTranslations.selectActive();
      this.quizForm.controls.title.setValue(localized.title, {emitEvent: false});
      this.quizForm.controls.description.setValue(localized.description, {emitEvent: false});
    }, {injector: this.injector});

    this.quizForm.controls.permanent.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isPermanent) => {
        if (isPermanent) {
          this.quizForm.controls.started_at.disable({emitEvent: false});
          this.quizForm.controls.ended_at.disable({emitEvent: false});
          this.quizForm.controls.started_at.setValue(null, {emitEvent: false});
          this.quizForm.controls.ended_at.setValue(null, {emitEvent: false});
        } else {
          this.quizForm.controls.started_at.enable({emitEvent: false});
          this.quizForm.controls.ended_at.enable({emitEvent: false});
        }
      });

    this.quizForm.controls.result_visibility.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((visibility) => {
        if (visibility === VisibilityEnumDto.Scheduled) {
          this.quizForm.controls.result_available_at.enable({emitEvent: false});
        } else {
          this.quizForm.controls.result_available_at.disable({emitEvent: false});
          this.quizForm.controls.result_available_at.setValue(null, {emitEvent: false});
        }
      });

    this.quizForm.controls.result_available_at.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (!value) {
          return;
        }
        // Detail visibility datetime always mirrors the one chosen for the
        // result. The detail visibility itself is bumped to "scheduled" if
        // it isn't already, so the date actually takes effect.
        if (this.quizForm.controls.detail_visibility.value !== VisibilityEnumDto.Scheduled) {
          this.quizForm.controls.detail_visibility.setValue(VisibilityEnumDto.Scheduled);
        }
        this.quizForm.controls.detail_available_at.setValue(value, {emitEvent: false});
      });

    this.quizForm.controls.detail_visibility.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((visibility) => {
        if (visibility === VisibilityEnumDto.Scheduled) {
          this.quizForm.controls.detail_available_at.enable({emitEvent: false});
        } else {
          this.quizForm.controls.detail_available_at.disable({emitEvent: false});
          this.quizForm.controls.detail_available_at.setValue(null, {emitEvent: false});
        }
      });

    this.quizForm.controls.with_duration.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((enabled) => {
        if (enabled) {
          this.quizForm.controls.duration.enable({emitEvent: false});
        } else {
          this.quizForm.controls.duration.disable({emitEvent: false});
          this.quizForm.controls.duration.setValue(10, {emitEvent: false});
        }
      });
    this.quizForm.controls.started_at.disable({emitEvent: false});
    this.quizForm.controls.ended_at.disable({emitEvent: false});
    this.quizForm.controls.result_available_at.disable({emitEvent: false});
    this.quizForm.controls.detail_available_at.disable({emitEvent: false});
    this.quizForm.controls.duration.disable({emitEvent: false});

    this.quizForm.controls.domain.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const domainId = Number(value ?? 0);
        this.selectedDomainId.set(domainId);
        this.onDomainSelected(domainId);
      });

    this.quizForm.controls.mode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const domainId = this.selectedDomainId();
        if (domainId) {
          this.onDomainSelected(domainId);
        }
      });

    this.quizForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.quizFormValid.set(this.quizForm.valid && this.templateTranslations.hasTitle()));

    this.selectedDomainId.set(Number(this.quizForm.controls.domain.value ?? 0));
    this.quizFormValid.set(this.quizForm.valid && this.templateTranslations.hasTitle());

    this.loading.set(true);
    forkJoin({
      domains: this.domainService.list(),
      subjects: this.subjectService.list(),
      template: templateId ? this.quizTemplateService.retrieve(templateId) : of(null),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({domains, subjects, template}) => {
          this.domains.set(domains ?? []);
          this.subjects.set(subjects ?? []);

          if (template) {
            this.patchTemplate(template);
            return;
          }

          const preferredDomain = this.userService.currentUser()?.current_domain;
          const defaultDomainId =
            domains.find((domain) => domain.id === preferredDomain)?.id ??
            (domains.length === 1 ? domains[0].id : 0);

          if (defaultDomainId) {
            this.quizForm.controls.domain.setValue(defaultDomainId);
          }
        },
        error: (err) => {
          console.error(err);
          this.error.set(this.editorUi().pages.quizCreate.errors.loadTemplateFailed);
        },
      });
  }

  goBack(): void {
    this.quizService.goList();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.search.set(target?.value ?? '');
  }

  onQuestionSubjectFilterChange(subjectIds: number[]): void {
    this.selectedQuestionSubjectIds.set(subjectIds);
  }

  setActiveEditorTab(value: string | number | undefined): void {
    if (value === 'questions' || value === 'configuration' || value === 'texts') {
      this.activeEditorTab.set(value);
    } else {
      this.activeEditorTab.set('texts');
    }
  }

  openQuestionPreview(question: SelectedQuestionRef): void {
    this.previewQuestionId.set(question.id);
  }

  openQuestionPreviewById(questionId: number): void {
    this.previewQuestionId.set(questionId);
  }

  closeQuestionPreview(): void {
    this.previewQuestionId.set(null);
  }

  async saveQuiz(): Promise<void> {
    this.submitError.set(null);
    this.error.set(null);

    if (!this.canManageSelectedDomain()) {
      this.submitError.set(this.editorUi().pages.quizCreate.errors.notAuthorized);
      return;
    }

    if (!this.templateTranslations.hasTitle()) {
      this.quizForm.markAllAsTouched();
      this.submitError.set(this.uiText().translationRequired);
      return;
    }

    if (!this.canSave()) {
      this.quizForm.markAllAsTouched();
      this.submitError.set(this.editorUi().pages.quizCreate.errors.completeQuizRequired);
      return;
    }

    this.saving.set(true);
    let quizTemplateId: number | null = null;

    try {
      if (this.isEditMode()) {
        const templateId = this.editingTemplateId();
        if (!templateId) {
          throw new Error(this.editorUi().pages.quizCreate.errors.templateNotFound);
        }
        const template = await firstValueFrom(
          this.quizTemplateService.update(templateId, this.buildQuizTemplatePayload()),
        );
        quizTemplateId = template.id;
        await this.composition.syncWithServer(template.id);
        this.lastSavedAt.set(new Date());
        this.quizForm.markAsPristine();
      } else {
        const template = await firstValueFrom(
          this.quizTemplateService.create(this.buildQuizTemplatePayload()),
        );
        quizTemplateId = template.id;
        await this.composition.syncWithServer(template.id);
        this.quizService.goList();
      }
    } catch (error) {
      console.error(error);
      this.submitError.set(
        this.isEditMode()
          ? this.editorUi().pages.quizCreate.errors.updateTemplateFailed
          : this.editorUi().pages.quizCreate.errors.createTemplateFailed,
      );

      if (quizTemplateId && !this.isEditMode()) {
        try {
          await firstValueFrom(this.quizTemplateService.destroy(quizTemplateId));
        } catch (cleanupError) {
          console.error('Erreur suppression template orphelin', cleanupError);
        }
      }
    } finally {
      this.saving.set(false);
    }
  }

  getQuestionTitle(question: SelectedQuestionRef): string {
    if ('title' in question && typeof question.title === 'string' && question.title.trim()) {
      return question.title.trim();
    }

    const translation = 'translations' in question
      ? selectTranslation<{title: string}>(
        question.translations as Record<string, {title: string}>,
        this.currentLang(),
      )
      : null;
    return translation?.title?.trim() || `Question #${question.id}`;
  }

  getQuestionSubjects(question: SelectedQuestionRef): string {
    if (!('subjects' in question) || !Array.isArray(question.subjects)) {
      return '';
    }

    return question.subjects
      .map((subject) => this.getSubjectLabel(subject, this.currentLang()))
      .join(', ');
  }

  domainLabel(domain: DomainReadDto): string {
    return this.getDomainLabel(domain);
  }

  protected onDomainSelected(domainId: number): void {
    this.submitError.set(null);
    this.error.set(null);
    this.questions.set([]);
    this.selectedQuestionSubjectIds.set([]);

    const hadSelection = this.composition.count() > 0;
    if (hadSelection && !this.preserveSelectionOnNextDomainChange) {
      this.composition.clear();
      this.submitError.set(this.editorUi().pages.quizCreate.errors.domainChangeReset);
    }
    this.preserveSelectionOnNextDomainChange = false;

    if (!domainId) {
      this.templateTranslations.configure([LanguageEnumDto.Fr as LangCode]);
      this.questionDialog.clear();
      return;
    }

    this.templateTranslations.configure(
      this.resolveDomainLanguages(this.domains().find((domain) => domain.id === domainId) ?? null),
      this.templateTranslations.collect(),
    );
    this.questionDialog.reset();
    this.questionsLoading.set(true);
    this.questionService.list({
      domainId,
      active: true,
      isModeExam: this.quizForm.controls.mode.value === ModeEnumDto.Exam ? true : undefined,
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.questionsLoading.set(false)),
      )
      .subscribe({
        next: (questions) => {
          this.questions.set(questions ?? []);
        },
        error: (error) => {
          console.error(error);
          this.error.set(this.editorUi().pages.quizCreate.errors.loadQuestionsFailed);
        },
      });
  }

  private buildQuizTemplatePayload(): QuizTemplateWriteRequestDto {
    const translations = this.templateTranslations.collect();
    const localized = this.templateTranslations.selectActive(translations);

    this.quizForm.controls.title.setValue(localized.title, {emitEvent: false});
    this.quizForm.controls.description.setValue(localized.description, {emitEvent: false});

    return {
      domain: this.selectedDomainId(),
      title: localized.title,
      description: localized.description,
      translations,
      mode: this.quizForm.controls.mode.value,
      max_questions: this.composition.count(),
      permanent: this.quizForm.controls.permanent.value,
      started_at: this.toIsoDateTime(this.quizForm.controls.started_at.value),
      ended_at: this.toIsoDateTime(this.quizForm.controls.ended_at.value),
      with_duration: this.quizForm.controls.with_duration.value,
      duration: this.quizForm.controls.with_duration.value
        ? Number(this.quizForm.controls.duration.value || 10)
        : 10,
      active: this.quizForm.controls.active.value,
      is_public: this.quizForm.controls.is_public.value,
      shuffle_questions: this.quizForm.controls.shuffle_questions.value,
      result_visibility: this.quizForm.controls.result_visibility.value,
      result_available_at: this.toIsoDateTime(this.quizForm.controls.result_available_at.value),
      detail_visibility: this.quizForm.controls.detail_visibility.value,
      detail_available_at: this.toIsoDateTime(this.quizForm.controls.detail_available_at.value),
    } as QuizTemplateLocalizedWriteRequestDto;
  }

  private patchTemplate(template: QuizTemplateDto): void {
    const localizedTemplate = template as QuizTemplateLocalizedDto;
    const domainId = Number(template.domain ?? 0);
    const isPermanent = template.permanent ?? true;
    const withDuration = template.with_duration ?? false;
    const resultVisibility = template.result_visibility ?? VisibilityEnumDto.Immediate;
    const detailVisibility = template.detail_visibility ?? VisibilityEnumDto.Immediate;
    const translations = localizedTemplate.translations ?? this.templateTranslations.buildFallback(template);

    this.composition.hydrate(template);

    this.quizForm.patchValue({
      domain: domainId,
      title: template.title ?? '',
      description: template.description ?? '',
      mode: template.mode ?? ModeEnumDto.Practice,
      active: template.active ?? true,
      is_public: template.is_public ?? false,
      shuffle_questions: template.shuffle_questions ?? false,
      permanent: isPermanent,
      started_at: this.fromIsoDateTime(template.started_at),
      ended_at: this.fromIsoDateTime(template.ended_at),
      with_duration: withDuration,
      duration: template.duration ?? 10,
      result_visibility: resultVisibility,
      result_available_at: this.fromIsoDateTime(template.result_available_at),
      detail_visibility: detailVisibility,
      detail_available_at: this.fromIsoDateTime(template.detail_available_at),
    }, {emitEvent: false});

    if (isPermanent) {
      this.quizForm.controls.started_at.disable({emitEvent: false});
      this.quizForm.controls.ended_at.disable({emitEvent: false});
    } else {
      this.quizForm.controls.started_at.enable({emitEvent: false});
      this.quizForm.controls.ended_at.enable({emitEvent: false});
    }

    if (withDuration) {
      this.quizForm.controls.duration.enable({emitEvent: false});
    } else {
      this.quizForm.controls.duration.disable({emitEvent: false});
    }

    if (resultVisibility === VisibilityEnumDto.Scheduled) {
      this.quizForm.controls.result_available_at.enable({emitEvent: false});
    } else {
      this.quizForm.controls.result_available_at.disable({emitEvent: false});
    }

    if (detailVisibility === VisibilityEnumDto.Scheduled) {
      this.quizForm.controls.detail_available_at.enable({emitEvent: false});
    } else {
      this.quizForm.controls.detail_available_at.disable({emitEvent: false});
    }

    this.selectedDomainId.set(domainId);
    this.templateTranslations.configure(
      this.resolveDomainLanguages(this.domains().find((domain) => domain.id === domainId) ?? null),
      translations,
    );
    this.quizFormValid.set(this.quizForm.valid && this.templateTranslations.hasTitle());
    this.preserveSelectionOnNextDomainChange = true;
    this.onDomainSelected(domainId);
  }

  private resolveDomainLanguages(domain: DomainReadDto | null): LangCode[] {
    const langs = (domain?.allowed_languages ?? [])
      .filter((language) => !!language.active && !!language.code)
      .map((language) => language.code)
      .filter((code): code is LangCode => !!code);
    return langs.length ? langs : [LanguageEnumDto.Fr as LangCode];
  }

  private toIsoDateTime(value: Date | string | null): string | null {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private fromIsoDateTime(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private applyDatePickerLocale(lang: LanguageEnumDto): void {
    const text = this.getUiText(lang);
    const translation: Translation = {
      dayNames: text.dayNames,
      dayNamesShort: text.dayNamesShort,
      dayNamesMin: text.dayNamesMin,
      monthNames: text.monthNames,
      monthNamesShort: text.monthNamesShort,
      today: text.today,
      clear: text.clear,
      weekHeader: text.weekHeader,
      dateFormat: text.dateFormat,
    };

    this.primeng.setTranslation(translation);
  }

  private getUiText(lang: LanguageEnumDto) {
    return getQuizCreateUiText(lang);
  }

  private getDomainLabel(domain: DomainReadDto): string {
    return getLocalizedDomainName(domain, this.currentLang());
  }

  private getSubjectLabel(
    subject: SubjectReadDto | QuestionReadDto['subjects'][number],
    lang: LanguageEnumDto,
  ): string {
    const translation = selectTranslation<{name: string}>(
      subject.translations as Record<string, {name: string}>,
      lang,
    );
    return translation?.name?.trim() || `Sujet #${subject.id}`;
  }
}
