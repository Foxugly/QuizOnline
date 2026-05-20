import {ChangeDetectionStrategy, Component, computed, inject, input, output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ButtonModule} from 'primeng/button';
import {CheckboxModule} from 'primeng/checkbox';
import {TabsModule} from 'primeng/tabs';
import {TooltipModule} from 'primeng/tooltip';

import {UiTextService} from '../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../shared/learning/content-block.types';
import {BlockListEditor} from '../../shared/learning/block-list-editor/block-list-editor';

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
    ButtonModule,
    CheckboxModule,
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

  readonly questionId = input.required<number>();
  readonly domainId = input.required<number>();
  readonly availableLangs = input.required<string[]>();
  readonly promptBlocks = input.required<ContentBlock[]>();
  readonly explanationBlocks = input.required<ContentBlock[]>();
  readonly answerRows = input.required<AnswerRowVm[]>();

  /** Fired after a block create / update / delete / reorder so the
   *  parent can refetch the question and refresh every block list. */
  readonly blocksChanged = output<void>();
  /** Fired when the author toggles an answer's "is_correct" checkbox. */
  readonly correctChanged = output<{answerId: number; isCorrect: boolean}>();
  /** Fired when the author clicks the "remove answer" trash button. */
  readonly removeAnswerClicked = output<number>();
  /** Fired when the author clicks the "add answer" CTA. */
  readonly addAnswerClicked = output<void>();

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

  protected onBlocksChanged(): void {
    this.blocksChanged.emit();
  }
}
