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

import {BlockCard} from '../block-card/block-card';
import {RichTextBlockEditor} from '../../../pages/lesson-edit/block-editors/rich-text-block-editor';
import {ImageBlockEditor} from '../../../pages/lesson-edit/block-editors/image-block-editor';
import {VideoBlockEditor} from '../../../pages/lesson-edit/block-editors/video-block-editor';
import {FileBlockEditor} from '../../../pages/lesson-edit/block-editors/file-block-editor';
import {QuizBlockEditor} from '../../../pages/lesson-edit/block-editors/quiz-block-editor';
import {CalloutBlockEditor} from '../../../pages/lesson-edit/block-editors/callout-block-editor';
import {CodeBlockEditor} from '../../../pages/lesson-edit/block-editors/code-block-editor';
import {EmbedBlockEditor} from '../../../pages/lesson-edit/block-editors/embed-block-editor';

import {getBlockListEditorUiText} from './block-list-editor.i18n';

/** Polymorphic host kinds a :class:`Block` may attach to. Mirrors the
 *  backend ``BlockSerializer`` write contract: exactly one wire field
 *  is populated on create — the host type drives which one. */
export type BlockHostType = 'lesson' | 'question' | 'answer_option';

/**
 * Reusable block-list editor extracted from ``pages/lesson-edit``.
 *
 * Each block has its own ``edit | readonly`` mode managed locally by
 * this component. Newly added blocks land in **edit mode** and carry
 * a "Save" + "Cancel" footer; existing blocks open **readonly** with
 * an "Edit" affordance in the header. The author drives every save
 * explicitly — there is no debounced auto-save on block content (only
 * structural mutations like drag-and-drop reorder still go through
 * silently).
 *
 * Cancel semantics:
 *
 * - On a *fresh draft* (a block created with ``+ Add`` but never
 *   persisted to a non-empty state), Cancel issues a ``DELETE
 *   /api/block/{id}/`` so the ghost row doesn't outlive the user
 *   walking away from the screen.
 * - On an existing block the user came back to edit, Cancel just
 *   flips the mode back to readonly — the editor's local state is
 *   discarded and the parent's ``ContentBlock`` snapshot keeps
 *   winning. No DELETE.
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
 * - ``blockUpdated`` — fired with the freshly-stored payload after
 *   an explicit Save succeeds, so the parent can splice the response
 *   into its local list without a full GET.
 */
@Component({
  selector: 'app-block-list-editor',
  imports: [
    DragDropModule,
    ButtonModule,
    BlockCard,
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
  /** Fired with the freshly-stored block payload after a successful
   *  per-block explicit Save. Lets the parent merge the response into
   *  its local list without round-tripping through a full
   *  ``GET /api/<host>/{id}/`` after every save. Structural mutations
   *  (add / delete / reorder) still fall back on ``blocksChanged``. */
  readonly blockUpdated = output<ContentBlock>();

  /** Block ids currently in edit mode. Initially empty — every block
   *  loaded from the parent's list opens readonly. ``addBlock`` adds
   *  the new id here so the new block opens directly in edit mode. */
  protected readonly editingIds = signal<Set<number>>(new Set());

  /** Block ids that were created via ``+ Add`` but have not yet been
   *  successfully saved. Used by ``cancelBlock`` to decide whether
   *  Cancel = discard local edits (existing block) or Cancel =
   *  delete the ghost draft (never-saved block). */
  protected readonly freshDraftIds = signal<Set<number>>(new Set());

  /** Block ids whose Save is currently in flight. Used to disable the
   *  Save / Cancel footer buttons during the round-trip so a rapid
   *  double-click can't fire two PATCHes against the same block. */
  protected readonly savingIds = signal<Set<number>>(new Set());

  /** Guard against two rapid clicks on the same "+ <type>" button
   *  racing two POSTs with the same ``order`` computed from the same
   *  stale ``blocks()`` snapshot — the second would hit the
   *  ``UNIQUE (target_content_type, target_object_id, block_role,
   *  order)`` constraint and 500. Held for the duration of the
   *  in-flight create; also gates the add-block bar UI so the buttons
   *  read disabled rather than just silently no-op. */
  protected readonly creating = signal<boolean>(false);

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

  protected isEditing(blockId: number): boolean {
    return this.editingIds().has(blockId);
  }

  protected isSaving(blockId: number): boolean {
    return this.savingIds().has(blockId);
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
    if (this.creating()) {
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

    this.creating.set(true);
    this.http.post<ContentBlock>(`${this.apiBaseUrl}/block/`, payload).subscribe({
      next: (created) => {
        this.creating.set(false);
        // Flag the new block as a fresh draft + open it in edit mode.
        // The parent will pick the new row up via ``blocksChanged``;
        // by the time it lands in ``this.blocks()`` the editing /
        // fresh-draft sets are already armed.
        this.editingIds.update((s) => {
          const next = new Set(s);
          next.add(created.id);
          return next;
        });
        this.freshDraftIds.update((s) => {
          const next = new Set(s);
          next.add(created.id);
          return next;
        });
        this.blocksChanged.emit();
        this.toast.add({severity: 'success', summary: this.ui().blockAddedToast});
      },
      error: (err: unknown) => {
        this.creating.set(false);
        logApiError('lms.block-list.add', err);
        this.toast.addApiError(err, this.ui().blockErrorToast);
      },
    });
  }

  protected deleteBlock(id: number): void {
    this.http.delete(`${this.apiBaseUrl}/block/${id}/`).subscribe({
      next: () => {
        this.editingIds.update((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
        this.freshDraftIds.update((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
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

  /** User clicked "Édit" on a readonly block — flip its mode and let
   *  the editor's local-state machinery kick in. No server hit. */
  protected editBlock(blockId: number): void {
    this.editingIds.update((s) => {
      const next = new Set(s);
      next.add(blockId);
      return next;
    });
  }

  /** User clicked "Enregistrer" on an editor in edit mode. Send the
   *  current local snapshot of the block to the backend. On 2xx, flip
   *  the block back to readonly and clear the fresh-draft flag (if
   *  set). On error, stay in edit mode and surface a toast.
   */
  protected saveBlock(blockId: number, snapshot: ContentBlock): void {
    if (this.savingIds().has(blockId)) {
      return;
    }
    this.savingIds.update((s) => {
      const next = new Set(s);
      next.add(blockId);
      return next;
    });
    this.http.patch<ContentBlock>(`${this.apiBaseUrl}/block/${blockId}/`, snapshot).subscribe({
      next: (saved) => {
        this.savingIds.update((s) => {
          const next = new Set(s);
          next.delete(blockId);
          return next;
        });
        this.editingIds.update((s) => {
          const next = new Set(s);
          next.delete(blockId);
          return next;
        });
        this.freshDraftIds.update((s) => {
          const next = new Set(s);
          next.delete(blockId);
          return next;
        });
        this.blockUpdated.emit(saved);
        this.toast.add({severity: 'success', summary: this.ui().blockSavedToast});
      },
      error: (err: unknown) => {
        this.savingIds.update((s) => {
          const next = new Set(s);
          next.delete(blockId);
          return next;
        });
        logApiError('lms.block-list.save', err);
        this.toast.addApiError(err, this.ui().blockErrorToast);
        // Intentional: stay in edit mode so the author can fix the
        // payload and click Save again without losing their edits.
      },
    });
  }

  /** User clicked "Annuler" on an editor in edit mode.
   *  - Fresh draft (never saved): DELETE the ghost row server-side.
   *  - Existing block: flip mode back to readonly; the editor will
   *    drop its local state and re-render from the parent's snapshot.
   */
  protected cancelBlock(blockId: number): void {
    if (this.freshDraftIds().has(blockId)) {
      this.deleteBlock(blockId);
      return;
    }
    this.editingIds.update((s) => {
      const next = new Set(s);
      next.delete(blockId);
      return next;
    });
  }
}
