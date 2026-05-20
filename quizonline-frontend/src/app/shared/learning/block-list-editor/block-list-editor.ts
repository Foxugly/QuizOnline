import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {CdkDragDrop, DragDropModule, moveItemInArray} from '@angular/cdk/drag-drop';
import {ButtonModule} from 'primeng/button';

import {logApiError} from '../../api/api-errors';
import {resolveApiBaseUrl} from '../../api/runtime-api-base-url';
import {UiTextService} from '../../i18n/ui-text.service';
import {AppToastService} from '../../toast/app-toast.service';
import {BlockType, getLearningCommonUiText} from '../learning-common.i18n';
import {BLOCK_ICONS} from '../block-icons';
import {BlockRole, ContentBlock} from '../content-block.types';

import {RichTextBlockEditor} from '../../../pages/lesson-edit/block-editors/rich-text-block-editor';
import {ImageBlockEditor} from '../../../pages/lesson-edit/block-editors/image-block-editor';
import {VideoBlockEditor} from '../../../pages/lesson-edit/block-editors/video-block-editor';
import {FileBlockEditor} from '../../../pages/lesson-edit/block-editors/file-block-editor';
import {QuizBlockEditor} from '../../../pages/lesson-edit/block-editors/quiz-block-editor';
import {CalloutBlockEditor} from '../../../pages/lesson-edit/block-editors/callout-block-editor';
import {CodeBlockEditor} from '../../../pages/lesson-edit/block-editors/code-block-editor';
import {EmbedBlockEditor} from '../../../pages/lesson-edit/block-editors/embed-block-editor';
import {SavedIndicator} from '../../../pages/lesson-edit/block-editors/saved-indicator';

import {getBlockListEditorUiText} from './block-list-editor.i18n';

/** Polymorphic host kinds a :class:`Block` may attach to. Mirrors the
 *  backend ``BlockSerializer`` write contract: exactly one wire field
 *  is populated on create — the host type drives which one. */
export type BlockHostType = 'lesson' | 'question' | 'answer_option';

/**
 * Reusable block-list editor extracted from ``pages/lesson-edit``.
 *
 * Renders an ordered list of :class:`ContentBlock` rows with full DnD
 * reorder, per-type editor host, "saved at HH:MM" indicator, delete
 * button, and an "add block" bar at the bottom. Each editor patches
 * its block via debounced PATCH ``/api/block/{id}/`` calls (or the
 * matching multipart upload for image / file blocks).
 *
 * Inputs:
 * - ``blocks`` — the ordered list of blocks (controlled by the
 *   parent; mutations flow through the ``blocksChanged`` output so the
 *   parent stays the source of truth).
 * - ``hostType`` / ``hostId`` — which host to attach new blocks to
 *   (``lesson`` / ``question`` / ``answer_option``).
 * - ``blockRole`` — the role to stamp on new blocks (``body`` /
 *   ``prompt`` / ``explanation``). Defaults to ``'body'``.
 * - ``availableLangs`` — list of language codes the per-type editors
 *   render tabs for.
 * - ``domainId`` — used by the quiz-block-editor template picker.
 *
 * Outputs:
 * - ``blocksChanged`` — fired after every reload following a CRUD or
 *   reorder; the parent should reload its block list (typically by
 *   re-fetching the host).
 */
@Component({
  selector: 'app-block-list-editor',
  imports: [
    DragDropModule,
    ButtonModule,
    SavedIndicator,
    RichTextBlockEditor,
    ImageBlockEditor,
    VideoBlockEditor,
    FileBlockEditor,
    QuizBlockEditor,
    CalloutBlockEditor,
    CodeBlockEditor,
    EmbedBlockEditor,
  ],
  templateUrl: './block-list-editor.html',
  styleUrl: './block-list-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlockListEditor {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(AppToastService);
  private readonly uiSvc = inject(UiTextService);

  protected readonly common = this.uiSvc.localized(getLearningCommonUiText);
  protected readonly ui = this.uiSvc.localized(getBlockListEditorUiText);

  readonly blocks = input.required<ContentBlock[]>();
  readonly hostType = input.required<BlockHostType>();
  readonly hostId = input.required<number>();
  readonly blockRole = input<BlockRole>('body');
  readonly availableLangs = input<string[]>(['fr', 'en']);
  readonly domainId = input<number | null>(null);
  /** Pass-through to each block editor. ``true`` on question hosts so
   *  the per-language ``title`` input + its language tab strip vanish —
   *  question blocks have no learner-facing outline so the field would
   *  just add noise to the editor. */
  readonly hideBlockTitles = input<boolean>(false);
  /** Pass-through to the rich-text block editor: when ``true``, the
   *  Quill editor starts at a single line and grows with content
   *  instead of pinning to a 200 px box. Turned on by question hosts
   *  where the prompt / answer / explanation are usually short. */
  readonly richTextAutogrow = input<boolean>(false);

  readonly blocksChanged = output<void>();

  /** Map of ``blockId -> lastSavedAt`` (ms epoch). Built locally so
   *  every embedded block-list keeps its own saved-at indicator
   *  without colliding with sibling lists in the same view. */
  protected readonly lastSavedAt = signal<Map<number, number>>(new Map());

  protected readonly blockIcons = BLOCK_ICONS;
  private readonly ALL_BLOCK_TYPES: ReadonlyArray<{value: BlockType}> = [
    {value: 'rich_text'}, {value: 'image'}, {value: 'video'},
    {value: 'file'}, {value: 'quiz'}, {value: 'callout'},
    {value: 'code'}, {value: 'embed'},
  ];
  /** Block types the "+ add" bar surfaces — derived from ``hostType``.
   *  Quiz blocks only make sense on lessons (a quiz inside a question
   *  would be a recursive content structure with no learner-facing
   *  semantics). For ``question`` / ``answer_option`` hosts we hide
   *  the option so the author can't even pick it. ``addBlock`` mirrors
   *  the filter as a defensive guard. */
  protected readonly blockTypes = computed<ReadonlyArray<{value: BlockType}>>(() => {
    if (this.hostType() === 'lesson') {
      return this.ALL_BLOCK_TYPES;
    }
    return this.ALL_BLOCK_TYPES.filter((t) => t.value !== 'quiz');
  });

  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api`;

  /** Stable composite anchor id so several block lists in the same
   *  page (prompt / answer 1 / answer 2 / explanation) never collide
   *  on a bare ``block-X`` id. */
  protected anchorFor(blockId: number): string {
    return `block-${this.hostType()}-${this.hostId()}-${blockId}`;
  }

  protected addBlock(type: BlockType): void {
    // Defensive guard: the "+ Quiz" button is hidden on question and
    // answer-option hosts (``blockTypes`` filter), but if a stale view
    // or a future caller invokes ``addBlock('quiz')`` on a non-lesson
    // host we drop the request rather than POST a quiz block onto a
    // structure that has no learner-facing way to render it.
    if (type === 'quiz' && this.hostType() !== 'lesson') {
      return;
    }
    const existing = this.blocks().map((b) => b.order);
    const order = existing.length > 0 ? Math.max(...existing) + 1 : 0;

    const payload: Record<string, unknown> = {
      block_type: type,
      block_role: this.blockRole(),
      order,
      translations: {},
    };
    payload[this.hostType()] = this.hostId();

    this.http.post(`${this.apiBaseUrl}/block/`, payload).subscribe({
      next: () => {
        this.blocksChanged.emit();
        this.toast.add({severity: 'success', summary: this.ui().blockAddedToast});
      },
      error: (err: unknown) => {
        logApiError('lms.block-list.add', err);
        this.toast.addApiError(err, this.ui().blockErrorToast);
      },
    });
  }

  protected deleteBlock(id: number): void {
    this.http.delete(`${this.apiBaseUrl}/block/${id}/`).subscribe({
      next: () => {
        this.blocksChanged.emit();
        this.toast.add({severity: 'success', summary: this.ui().blockDeletedToast});
      },
      error: (err: unknown) => {
        logApiError('lms.block-list.delete', err);
        this.toast.addApiError(err, this.ui().blockErrorToast);
      },
    });
  }

  protected onDrop(event: CdkDragDrop<ContentBlock[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    const list = [...this.blocks()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    // Single atomic endpoint for every host type — backend
    // ``POST /api/block/reorder/`` validates the (host_type, host_id,
    // block_role) tuple and re-numbers all matching blocks inside one
    // transaction. Earlier phases had a per-host endpoint for lesson
    // only and fell back to a per-block PATCH for question /
    // answer_option; the unified endpoint kills that asymmetry and
    // keeps reorder atomic on every host.
    this.http.post(`${this.apiBaseUrl}/block/reorder/`, {
      host_type: this.hostType(),
      host_id: this.hostId(),
      ids: list.map((b) => b.id),
      block_role: this.blockRole(),
    }).subscribe({
      next: () => {
        this.blocksChanged.emit();
        this.toast.add({severity: 'success', summary: this.ui().reorderSuccessToast});
      },
      error: (err: unknown) => {
        logApiError('lms.block-list.reorder', err);
        this.toast.addApiError(err, this.ui().reorderErrorToast);
      },
    });
  }

  protected savedAtFor(blockId: number): Date | null {
    const ts = this.lastSavedAt().get(blockId);
    return ts ? new Date(ts) : null;
  }

  protected onBlockChanged(blockId: number, patch: Partial<ContentBlock>): void {
    this.http.patch(`${this.apiBaseUrl}/block/${blockId}/`, patch).subscribe({
      next: () => {
        this.lastSavedAt.update((m) => {
          const next = new Map(m);
          next.set(blockId, Date.now());
          return next;
        });
        // Trigger an upstream reload so other reactive views (the
        // preview, the outline, the post-image url) pick up the new
        // server state. Lesson-edit gets away without this because it
        // applies a local optimistic merge; question-edit's nested
        // lists make that brittle, so we just refetch.
        this.blocksChanged.emit();
      },
      error: (err: unknown) => {
        logApiError('lms.block-list.patch', err);
        this.toast.addApiError(err, this.ui().blockErrorToast);
      },
    });
  }
}
