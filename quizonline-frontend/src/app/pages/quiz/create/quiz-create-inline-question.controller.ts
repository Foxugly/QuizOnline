import {Injectable, inject, signal} from '@angular/core';
import {NonNullableFormBuilder} from '@angular/forms';
import {firstValueFrom} from 'rxjs';

import {DomainReadDto} from '../../../api/generated/model/domain-read';
import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {QuestionReadDto} from '../../../api/generated/model/question-read';
import {QuestionService} from '../../../services/question/question';
import {
  addQuestionAnswerOption,
  buildQuestionCreatePayload,
  createQuestionEditorForm,
  ensureQuestionTranslationControls,
  getQuestionCorrectCount,
  getQuestionTrGroup,
  isQuestionEditorFormValid,
  QuestionEditorForm,
} from '../../../services/question/question-editor-form';
import {LangCode, TranslateBatchItem, TranslationService} from '../../../services/translation/translation';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {getQuizCreateUiText} from './quiz-create.i18n';

export interface InlineQuestionDialogBinding {
  /** Currently selected domain on the host form, or null if none chosen. */
  readonly selectedDomain: () => DomainReadDto | null;
  /** Currently selected domain id (0 when nothing chosen). */
  readonly selectedDomainId: () => number;
  /**
   * Called when a new question is saved successfully. The host appends
   * it to the library and selects it on the composition pane.
   */
  readonly onQuestionCreated: (question: QuestionReadDto) => void;
  /**
   * Surface a top-of-page error (e.g. translation API failure). Kept
   * separate from the dialog-local submit error because the message
   * targets a banner the dialog cannot host itself. Passing ``null``
   * clears the banner.
   */
  readonly onPageError: (message: string | null) => void;
  /** Localised label for "domain required first" page-level error. */
  readonly domainRequiredFirstMessage: () => string;
}

/**
 * Inline "create a question" dialog slice of /quiz/create. Owns the
 * dialog visibility, the per-question editor form, language tabs,
 * translation-call orchestration and the save flow. Designed for
 * component-scoped injection (``providers: [QuizCreateInlineQuestionController]``)
 * so the form / signals live for the lifetime of the host page only.
 *
 * Communication with the host happens through ``bind()`` callbacks:
 * - reads (selectedDomain / selectedDomainId / domainRequiredFirstMessage)
 *   to gate "open" + seed the per-domain language tabs;
 * - writes (onQuestionCreated / onPageError) so the host owns adding
 *   the new question to the library + surfacing translation errors at
 *   the page level.
 */
@Injectable()
export class QuizCreateInlineQuestionController {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly questionService = inject(QuestionService);
  private readonly translationService = inject(TranslationService);
  private readonly editorUi = inject(UiTextService).editor;

  readonly visible = signal(false);
  readonly saving = signal(false);
  readonly translating = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly langs = signal<LangCode[]>([]);
  readonly activeLang = signal<LangCode | null>(null);

  form: QuestionEditorForm = createQuestionEditorForm(this.fb, {domainDisabled: true});

  private binding: InlineQuestionDialogBinding | null = null;

  bind(binding: InlineQuestionDialogBinding): void {
    this.binding = binding;
  }

  /** Called by the host every time the user switches the app language —
   * if the selected language has a tab in the dialog we follow it. */
  syncActiveLang(lang: LangCode): void {
    if (this.langs().includes(lang)) {
      this.activeLang.set(lang);
    }
  }

  /** Wipe state when the host switches to "no domain selected". */
  clear(): void {
    this.langs.set([]);
    this.activeLang.set(null);
  }

  open(): void {
    if (!this.binding) {
      return;
    }
    if (!this.binding.selectedDomainId()) {
      this.binding.onPageError(this.binding.domainRequiredFirstMessage());
      return;
    }
    this.submitError.set(null);
    this.reset();
    this.visible.set(true);
  }

  close(): void {
    this.visible.set(false);
  }

  setVisible(value: boolean): void {
    this.visible.set(value);
  }

  onTabChange(value: string | number | undefined): void {
    if (value === undefined || value === null) {
      return;
    }
    this.activeLang.set(String(value) as LangCode);
  }

  addOption(): void {
    addQuestionAnswerOption(this.fb, this.form, this.langs());
  }

  removeOption(index: number): void {
    if (this.form.controls.answer_options.length <= 2) {
      return;
    }

    this.form.controls.answer_options.removeAt(index);

    this.form.controls.answer_options.controls.forEach((control, controlIndex) => {
      control.get('sort_order')?.setValue(controlIndex + 1);
    });
  }

  /** Re-seed the form for the current domain — call from the host every
   * time the chosen domain (or its allowed languages) changes. */
  reset(): void {
    if (!this.binding) {
      return;
    }
    const domain = this.binding.selectedDomain();
    const domainId = this.binding.selectedDomainId();

    this.form = createQuestionEditorForm(this.fb, {domainDisabled: true});
    this.form.controls.domain.setValue(domainId);
    this.form.controls.domain.disable({emitEvent: false});
    this.form.controls.active.setValue(true);
    this.form.controls.is_mode_practice.setValue(true);
    this.form.controls.is_mode_exam.setValue(false);

    const allowed = (domain?.allowed_languages ?? [])
      .filter((language) => !!language.active)
      .map((language) => language.code)
      .filter((code): code is LangCode => !!code);

    const resolvedLangs = allowed.length ? allowed : [LanguageEnumDto.Fr as LangCode];
    this.langs.set(resolvedLangs);
    this.activeLang.set(resolvedLangs[0] ?? null);

    ensureQuestionTranslationControls(this.fb, this.form, resolvedLangs);
    addQuestionAnswerOption(this.fb, this.form, resolvedLangs);
    addQuestionAnswerOption(this.fb, this.form, resolvedLangs);
  }

  async translate(): Promise<void> {
    const sourceLang = this.activeLang();
    if (!sourceLang) {
      return;
    }
    const binding = this.binding;

    this.translating.set(true);
    this.submitError.set(null);

    try {
      // Phase 3.5: the inline question dialog only collects the
      // structural metadata + per-language ``title``. The
      // description / explanation / answer-content rich-text fields
      // are gone — the user fills those via the full editor on
      // ``/question/<id>/edit`` after the dialog saves.
      const sourceGroup = getQuestionTrGroup(this.form, sourceLang);
      const sourceTitle = sourceGroup.controls.title.value ?? '';

      for (const targetLang of this.langs()) {
        if (targetLang === sourceLang) {
          continue;
        }

        const targetGroup = getQuestionTrGroup(this.form, targetLang);
        const items: TranslateBatchItem[] = [];

        if (!(targetGroup.controls.title.value ?? '').trim() && sourceTitle.trim()) {
          items.push({key: 'title', text: sourceTitle, format: 'text'});
        }

        if (!items.length) {
          continue;
        }

        const translated = await this.translationService.translateBatch(sourceLang, targetLang, items);
        if (translated['title'] !== undefined) {
          targetGroup.controls.title.setValue(translated['title']);
        }
      }
    } catch (error) {
      console.error(error);
      // The dialog inline error stays focused on the local failure mode;
      // the host can also surface a banner via onPageError so the user
      // notices even if their attention is elsewhere on the page.
      this.submitError.set(this.editorUi().pages.quizCreate.errors.translateQuestionFailed);
      if (binding) {
        queueMicrotask(() => binding.onPageError(this.editorUi().pages.quizCreate.errors.createQuizFailed));
      }
    } finally {
      this.translating.set(false);
    }
  }

  async save(): Promise<void> {
    const binding = this.binding;
    this.submitError.set(null);

    if (!isQuestionEditorFormValid(this.form, this.langs(), {requireDomain: true})) {
      this.submitError.set(this.editorUi().pages.questionCreate.errors.missingFields);
      this.form.markAllAsTouched();
      return;
    }

    if (getQuestionCorrectCount(this.form) === 0) {
      this.submitError.set(this.editorUi().pages.quizCreate.errors.needOneCorrect);
      return;
    }

    this.saving.set(true);

    try {
      const payload = buildQuestionCreatePayload(this.form, this.langs());

      const createdQuestion = await firstValueFrom(this.questionService.create(payload));
      binding?.onQuestionCreated(createdQuestion);
      this.close();
    } catch (error) {
      console.error(error);
      this.submitError.set(this.editorUi().pages.quizCreate.errors.createQuestionFailed);
    } finally {
      this.saving.set(false);
    }
  }
}
