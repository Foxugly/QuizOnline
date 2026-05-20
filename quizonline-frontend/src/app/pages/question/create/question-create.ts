import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, OnInit, signal} from '@angular/core';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {ActivatedRoute} from '@angular/router';
import {NonNullableFormBuilder, ReactiveFormsModule} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {firstValueFrom, forkJoin} from 'rxjs';
import {finalize} from 'rxjs/operators';

import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';

import {DomainReadDto} from '../../../api/generated/model/domain-read';
import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {SubjectReadDto} from '../../../api/generated/model/subject-read';
import {QuestionEditorFormComponent} from '../../../components/question-editor-form/question-editor-form';
import {DomainOption, DomainService, DomainTranslations} from '../../../services/domain/domain';
import {
  addQuestionAnswerOption,
  buildQuestionCreatePayload,
  clearQuestionTranslationTab,
  createQuestionEditorForm,
  ensureQuestionTranslationControls,
  getQuestionCorrectCount,
  isQuestionEditorFormValid,
  populateQuestionEditorFormFromDraft,
  QuestionEditorForm,
  resetQuestionTranslationsOnly,
} from '../../../services/question/question-editor-form';
import {QuestionService} from '../../../services/question/question';
import {SubjectService} from '../../../services/subject/subject';
import {LangCode} from '../../../services/translation/translation';
import {UserService} from '../../../services/user/user';
import {selectTranslation} from '../../../shared/i18n/select-translation';
import {AppToastService} from '../../../shared/toast/app-toast.service';

/**
 * ``/question/add`` page.
 *
 * Phase 3.5: the create flow is now a context-only step. The user
 * picks a domain, optional subjects, the mode flags, fills the
 * per-language title and (optionally) checks correct answers / adds
 * empty answer rows. On save we POST the question and immediately
 * redirect to ``/question/<id>/edit`` where the full 3-tab block
 * editor surfaces. This pattern mirrors the LMS lesson flow (create
 * via course-edit, content via lesson-edit) and avoids the
 * impedance-mismatch between "the user is editing blocks" and "the
 * question doesn't have an id yet".
 */
@Component({
  selector: 'app-question-create',
  templateUrl: './question-create.html',
  styleUrl: './question-create.scss',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    QuestionEditorFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionCreate implements OnInit {
  readonly ui = inject(UiTextService).editor;
  readonly emptyLanguagesMessage = computed(() => this.ui().pages.questionCreate.emptyLanguagesMessage);

  loading = signal(true);
  domainLoading = signal(false);
  saving = signal(false);
  translating = signal(false);

  error = signal<string | null>(null);
  submitError = signal<string | null>(null);

  readonly isLocked = computed(
    () => this.loading() || this.domainLoading() || this.saving() || this.translating(),
  );

  domains = signal<DomainReadDto[]>([]);
  subjects = signal<SubjectReadDto[]>([]);
  selectedDomainId = signal<number>(0);
  domainLangs = signal<LangCode[]>([]);
  activeLang = signal<LangCode | null>(null);
  currentLang = signal<LanguageEnumDto>(LanguageEnumDto.En);

  readonly domainOptions = computed<DomainOption[]>(() => {
    const lang = this.currentLang();
    return this.domains().map((domain) => ({
      id: domain.id,
      name: this.getDomainLabel(domain, lang),
    }));
  });

  readonly filteredSubjects = computed(() => {
    const domainId = this.selectedDomainId();
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

  private fb = inject(NonNullableFormBuilder);
  form: QuestionEditorForm = createQuestionEditorForm(this.fb, {subjectIdsDisabled: true});

  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private domainService = inject(DomainService);
  private subjectService = inject(SubjectService);
  private questionService = inject(QuestionService);
  private userService = inject(UserService);
  private toast = inject(AppToastService);
  private pendingDuplicateDraft = this.questionService.consumeDuplicateDraft();

  constructor() {
    effect(() => {
      const locked = this.isLocked();

      if (locked) {
        this.form.controls.domain.disable({emitEvent: false});
      } else {
        this.form.controls.domain.enable({emitEvent: false});
      }

      const enableSubjects = !locked && !!this.selectedDomainId() && this.subjectOptions().length > 0;
      if (enableSubjects) {
        this.form.controls.subject_ids.enable({emitEvent: false});
      } else {
        this.form.controls.subject_ids.disable({emitEvent: false});
      }
    });
  }

  tabCodes(): LangCode[] {
    return this.domainLangs();
  }

  ngOnInit(): void {
    this.currentLang.set(this.userService.currentLang ?? LanguageEnumDto.Fr);

    this.form.controls.domain.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.onDomainChange(Number(value ?? 0)));

    this.loading.set(true);
    forkJoin({
      domains: this.domainService.list(),
      subjects: this.subjectService.list(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({domains, subjects}) => {
          this.domains.set(domains ?? []);
          this.subjects.set(subjects ?? []);

          if (this.pendingDuplicateDraft) {
            this.form.controls.domain.setValue(this.pendingDuplicateDraft.domainId, {emitEvent: false});
            this.onDomainChange(this.pendingDuplicateDraft.domainId);
            return;
          }

          const currentDomainId = this.userService.currentUser()?.current_domain ?? 0;
          if (currentDomainId > 0 && (domains ?? []).some((domain) => domain.id === currentDomainId)) {
            this.form.controls.domain.setValue(currentDomainId, {emitEvent: false});
            this.onDomainChange(currentDomainId);
          }
        },
        error: (err) => {
          console.error(err);
          this.error.set(this.ui().pages.questionCreate.errors.loadInitialFailed);
        },
      });

    const queryDomainId = Number(this.route.snapshot.queryParamMap.get('domainId') ?? 0);
    if (!this.pendingDuplicateDraft && queryDomainId > 0) {
      this.form.controls.domain.setValue(queryDomainId, {emitEvent: false});
      this.onDomainChange(queryDomainId);
    }
  }

  goList(): void {
    this.questionService.goList();
  }

  goBack(): void {
    this.questionService.goBack();
  }

  clearActiveTab(): void {
    const lang = this.activeLang();
    if (!lang) {
      return;
    }
    clearQuestionTranslationTab(this.form, lang);
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

  async save(): Promise<void> {
    const errors = this.ui().pages.questionCreate.errors;
    this.error.set(null);
    this.submitError.set(null);

    if (!isQuestionEditorFormValid(this.form, this.domainLangs(), {requireDomain: true})) {
      this.error.set(errors.missingFields);
      this.showErrorToast(errors.missingFields);
      this.form.markAllAsTouched();
      return;
    }

    if (getQuestionCorrectCount(this.form) === 0) {
      this.submitError.set(errors.missingCorrectAnswer);
      this.showErrorToast(errors.missingCorrectAnswer);
      return;
    }

    this.saving.set(true);

    try {
      const payload = buildQuestionCreatePayload(this.form, this.domainLangs());

      const created = await firstValueFrom(this.questionService.create(payload));
      // Phase 3.5: question content (prompt / answers / explanation
      // blocks) is now edited from the dedicated 3-tab editor on
      // ``/question/<id>/edit``. Send the author there right away so
      // they can fill in the actual blocks.
      this.questionService.goEdit(created.id);
    } catch (error) {
      console.error('Erreur creation question', error);
      this.submitError.set(errors.saveFailed);
      this.showErrorToast(errors.saveFailed);
    } finally {
      this.saving.set(false);
    }
  }

  protected onDomainChange(domainId: number): void {
    this.error.set(null);
    this.submitError.set(null);
    this.selectedDomainId.set(domainId);

    this.form.controls.subject_ids.setValue([]);
    resetQuestionTranslationsOnly(this.form);
    this.domainLangs.set([]);
    this.activeLang.set(null);

    if (!domainId || domainId <= 0) {
      return;
    }

    const draft = this.pendingDuplicateDraft;
    if (draft && draft.domainId === domainId) {
      const draftLangs = this.resolveDraftLangs(draft);
      this.domainLangs.set(draftLangs);
      populateQuestionEditorFormFromDraft(this.fb, this.form, draft, draftLangs);
      this.activeLang.set(draftLangs[0] ?? null);
      this.pendingDuplicateDraft = null;
    }

    this.domainLoading.set(true);
    this.domainService
      .retrieve(domainId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.domainLoading.set(false)),
      )
      .subscribe({
        next: (domain) => {
          const codes = (domain.allowed_languages ?? [])
            .filter((language) => !!language.active)
            .map((language) => language.code)
            .filter((code): code is LangCode => !!code);

          const langs = codes.length ? codes : [LanguageEnumDto.Fr as unknown as LangCode];
          this.domainLangs.set(langs);

          ensureQuestionTranslationControls(this.fb, this.form, langs);
          if (this.form.controls.answer_options.length === 0) {
            addQuestionAnswerOption(this.fb, this.form, langs);
            addQuestionAnswerOption(this.fb, this.form, langs);
          }

          const draft = this.pendingDuplicateDraft;
          if (draft && draft.domainId === domainId) {
            populateQuestionEditorFormFromDraft(this.fb, this.form, draft, langs);
            this.pendingDuplicateDraft = null;
          }

          this.activeLang.set(this.resolvePreferredLang(langs));
        },
        error: (error) => {
          console.error(error);
          this.error.set(this.ui().pages.questionCreate.errors.loadDomainFailed);
        },
      });
  }

  private resolveDraftLangs(draft: NonNullable<QuestionCreate['pendingDuplicateDraft']>): LangCode[] {
    const domain = this.domains().find((item) => item.id === draft.domainId);
    const codes = (domain?.allowed_languages ?? [])
      .filter((language) => !!language.active)
      .map((language) => language.code)
      .filter((code): code is LangCode => !!code);

    return codes.length ? codes : (Object.keys(draft.translations) as LangCode[]);
  }

  private resolvePreferredLang(langs: LangCode[]): LangCode | null {
    const current = this.currentLang();
    if (langs.includes(current as LangCode)) {
      return current as LangCode;
    }
    return langs[0] ?? null;
  }

  private getDomainLabel(domain: DomainReadDto, lang: LanguageEnumDto): string {
    const translations = domain.translations as DomainTranslations | undefined;
    const current = translations?.[lang]?.name?.trim();
    if (current) {
      return current;
    }

    const fallbacks: LanguageEnumDto[] = [LanguageEnumDto.Fr, LanguageEnumDto.En, LanguageEnumDto.Nl];
    for (const fallback of fallbacks) {
      const value = translations?.[fallback]?.name?.trim();
      if (value) {
        return value;
      }
    }

    return `Domain #${domain.id}`;
  }

  private showErrorToast(detail: string): void {
    this.toast.add({
      severity: 'error',
      summary: this.ui().pages.questionCreate.errors.toastSummary,
      detail,
    });
  }
}
