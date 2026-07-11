import {ChangeDetectionStrategy, Component, computed, inject, input, output, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ButtonModule} from 'primeng/button';
import {CheckboxModule} from 'primeng/checkbox';
import {InputTextModule} from 'primeng/inputtext';
import {TabsModule} from 'primeng/tabs';
import {TooltipModule} from 'primeng/tooltip';

import {logApiError} from '../../shared/api/api-errors';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {interp} from '../../shared/i18n/format';
import {AppToastService} from '../../shared/toast/app-toast.service';
import {ContentBlock} from '../../shared/learning/content-block.types';
import {BlockListEditor} from '../../shared/learning/block-list-editor/block-list-editor';
import {TranslateBatchItem, TranslationService} from '../../services/translation/translation';

import {getBlockEditorsUiText} from '../../shared/learning/block-editors/block-editors.i18n';
import {getQuestionEditorFormUiText} from './question-editor-form.i18n';

/**
 * View-model for a single answer row inside the "Réponses" tab.
 * Mirrors the read-only shape ``QuestionAnswerOptionReadDto`` and is
 * what the parent passes in — the parent owns the source of truth and
 * the writeable controls (``is_correct`` is mirrored via the
 * ``correctChanged`` output).
 */
export interface AnswerRowVm {
  id: number;
  is_correct: boolean;
  sort_order: number;
  blocks: ContentBlock[];
}

/**
 * Three-tab editor surfaced beneath the question context card on
 * ``/question/<id>/edit`` (the create page redirects here as soon as
 * it has saved the question and obtained an ``id``).
 *
 * Tabs:
 * 1. **Question** — prompt blocks (``Block.block_role = 'prompt'`` on
 *    the Question host).
 * 2. **Réponses** — list of ``AnswerOption`` rows; each row carries
 *    its own block list (``Block.block_role = 'body'`` on the
 *    AnswerOption host) plus a correctness checkbox and a "remove"
 *    button.
 * 3. **Explication** — explanation blocks
 *    (``Block.block_role = 'explanation'`` on the Question host).
 *
 * Each tab embeds ``<app-block-list-editor>`` which handles the
 * language sub-tabs, the translate-from-current-tab button, and the
 * full DnD reorder + per-type editor stack. This component is just
 * the orchestration layer — it owns no editor state.
 */
@Component({
  selector: 'app-question-block-tabs',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    TabsModule,
    TooltipModule,
    BlockListEditor,
  ],
  templateUrl: './question-block-tabs.html',
  styleUrl: './question-block-tabs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionBlockTabs {
  protected readonly ui = inject(UiTextService).localized(getQuestionEditorFormUiText);

  protected answerHeadingText(index: number): string {
    return interp(this.ui().answerHeading, {index});
  }

  readonly questionId = input.required<number>();
  readonly domainId = input.required<number>();
  readonly availableLangs = input.required<string[]>();
  readonly promptBlocks = input.required<ContentBlock[]>();
  readonly explanationBlocks = input.required<ContentBlock[]>();
  readonly answerRows = input.required<AnswerRowVm[]>();
  /** Reactive form host owned by the parent ``<app-question-editor-form>``
   *  context card. Used by the Question tab to render a per-language
   *  title input at the top, next to the prompt blocks it labels — the
   *  legacy "Content" card is gone, so the title lives here. */
  readonly form = input.required<FormGroup>();
  readonly editorUi = inject(UiTextService).editor;

  /** Form helper: ``translations`` is a nested ``FormGroup`` whose keys
   *  are the language codes. Mirrors ``QuestionEditorFormComponent.translationsGroup``. */
  protected translationsGroup(): FormGroup {
    return this.form().get('translations') as FormGroup;
  }

  protected langHasTranslation(lang: string): boolean {
    const group = this.translationsGroup();
    return group ? group.contains(lang) : false;
  }

  /** Fired after a block CREATE / DELETE / REORDER so the parent
   *  refetches the question and refreshes every block list. */
  readonly blocksChanged = output<void>();
  /** Fired with the server's freshly-stored block after a PATCH —
   *  the parent merges by id into its local list without refetching
   *  the whole question (high-traffic on continuous typing). */
  readonly blockUpdated = output<ContentBlock>();
  /** Fired when the author toggles an answer's "is_correct" checkbox. */
  readonly correctChanged = output<{answerId: number; isCorrect: boolean}>();
  /** Fired when the author clicks the "remove answer" trash button. */
  readonly removeAnswerClicked = output<number>();
  /** Fired when the author clicks the "add answer" CTA. */
  readonly addAnswerClicked = output<void>();
  /** Fired when the author clicks the "duplicate answer" row button. */
  readonly duplicateAnswerClicked = output<number>();

  private readonly translator = inject(TranslationService);
  private readonly toast = inject(AppToastService);
  protected readonly blockEditorsUi = inject(UiTextService).localized(getBlockEditorsUiText);
  protected readonly titleActiveLang = signal<string>('');
  protected readonly titleTranslating = signal(false);

  onTitleTabChange(value: string | number | undefined): void {
    if (value === undefined || value === null) {
      return;
    }
    this.titleActiveLang.set(String(value));
  }

  /** Inline translate button next to the title language tabs. Reads
   *  the title from the active source tab, then fills any blank
   *  target-tab title via :class:`TranslationService`. Mirrors the
   *  ``<app-block-translate-button>`` UX but operates on the form's
   *  ``translations.<lang>.title`` controls instead of on a Block
   *  payload. */
  async runTitleTranslate(): Promise<void> {
    if (this.titleTranslating()) {
      return;
    }
    const source = this.titleActiveLang() || this.availableLangs()[0];
    if (!source) {
      return;
    }
    const targets = this.availableLangs().filter((l) => l !== source);
    if (targets.length === 0) {
      return;
    }
    const translationsGroup = this.translationsGroup();
    const sourceTitle = (translationsGroup?.get([source, 'title'])?.value ?? '').toString().trim();
    if (!sourceTitle) {
      return;
    }

    this.titleTranslating.set(true);
    try {
      // Pre-resolve every target lang's control + batch payload in
      // one sync pass, then fire all ``translateBatch`` calls in
      // parallel via ``Promise.all`` — wall time becomes max(call
      // latency) instead of sum across targets.
      const plans = targets.flatMap((target) => {
        if (!translationsGroup.contains(target)) {
          return [];
        }
        const targetCtrl = translationsGroup.get([target, 'title']);
        if (!targetCtrl) {
          return [];
        }
        const current = (targetCtrl.value ?? '').toString().trim();
        if (current) {
          return [];
        }
        const items: TranslateBatchItem[] = [{key: 'title', text: sourceTitle, format: 'text'}];
        return [{target, ctrl: targetCtrl, items}];
      });

      const results = await Promise.all(
        plans.map((p) =>
          this.translator
            .translateBatch(source, p.target, p.items)
            .then((out) => ({ctrl: p.ctrl, out})),
        ),
      );

      let touched = false;
      for (const {ctrl, out} of results) {
        if (out['title']) {
          ctrl.setValue(out['title']);
          ctrl.markAsDirty();
          touched = true;
        }
      }
      if (touched) {
        this.toast.add({severity: 'success', summary: this.blockEditorsUi().translateSuccessToast});
      }
    } catch (err) {
      logApiError('question.title-translate', err);
      this.toast.addApiError(err, this.blockEditorsUi().translateErrorToast);
    } finally {
      this.titleTranslating.set(false);
    }
  }

  protected readonly tabs = ['question', 'answers', 'explanation'] as const;
  protected readonly activeTab = computed(() => this.tabs[0]);

  protected onCorrectToggle(answerId: number, isCorrect: boolean): void {
    this.correctChanged.emit({answerId, isCorrect});
  }

  protected onRemoveAnswer(answerId: number): void {
    if (window.confirm(this.ui().confirmRemoveAnswer)) {
      this.removeAnswerClicked.emit(answerId);
    }
  }

  protected onAddAnswer(): void {
    this.addAnswerClicked.emit();
  }

  protected onDuplicateAnswer(answerId: number): void {
    this.duplicateAnswerClicked.emit(answerId);
  }

  protected onBlocksChanged(): void {
    this.blocksChanged.emit();
  }

  protected onBlockUpdated(block: ContentBlock): void {
    this.blockUpdated.emit(block);
  }
}
