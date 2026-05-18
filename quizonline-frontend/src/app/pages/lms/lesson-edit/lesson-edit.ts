import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute} from '@angular/router';
import {CdkDragDrop, DragDropModule, moveItemInArray} from '@angular/cdk/drag-drop';
import {ButtonModule} from 'primeng/button';
import {Subscription} from 'rxjs';

import {logApiError} from '../../../shared/api/api-errors';
import {resolveApiBaseUrl} from '../../../shared/api/runtime-api-base-url';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {AppToastService} from '../../../shared/toast/app-toast.service';
import {LmsCatalogService} from '../../../services/lms/lms-catalog.service';
import {ContentBlock} from '../../../shared/lms/content-block.types';
import {BLOCK_ICONS} from '../../../shared/lms/block-icons';
import {BlockType, getLmsCommonUiText} from '../../../shared/lms/lms-common.i18n';

import {getLmsLessonEditUiText} from './lesson-edit.i18n';
import {RichTextBlockEditor} from './block-editors/rich-text-block-editor';
import {ImageBlockEditor} from './block-editors/image-block-editor';
import {VideoBlockEditor} from './block-editors/video-block-editor';
import {FileBlockEditor} from './block-editors/file-block-editor';
import {QuizBlockEditor} from './block-editors/quiz-block-editor';
import {CalloutBlockEditor} from './block-editors/callout-block-editor';
import {CodeBlockEditor} from './block-editors/code-block-editor';
import {EmbedBlockEditor} from './block-editors/embed-block-editor';

/**
 * Shape consumed from ``GET /api/lms/lesson/{id}/``. Mirrors the
 * subset of the lesson serializer the editor cares about: the
 * ordered list of blocks, and the parent course's
 * ``available_lang_codes`` which gates which language tabs every
 * translatable block editor renders.
 */
interface LessonDetailDto {
  id: number;
  blocks?: ContentBlock[];
  available_lang_codes?: string[];
}

/**
 * Lesson-author shell: ordered list of content blocks with
 * ``@angular/cdk`` drag-and-drop reorder, per-type editor host, and
 * an "add block" bar at the bottom. Every mutating endpoint is hit
 * via ``HttpClient + resolveApiBaseUrl()`` to match the rest of the
 * LMS pages; reorder funnels through :class:`LmsCatalogService`
 * which already knows the bulk-reorder route.
 */
@Component({
  selector: 'app-lms-lesson-edit',
  imports: [
    DragDropModule,
    ButtonModule,
    RichTextBlockEditor,
    ImageBlockEditor,
    VideoBlockEditor,
    FileBlockEditor,
    QuizBlockEditor,
    CalloutBlockEditor,
    CodeBlockEditor,
    EmbedBlockEditor,
  ],
  templateUrl: './lesson-edit.html',
  styleUrl: './lesson-edit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsLessonEdit implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly catalog = inject(LmsCatalogService);
  private readonly toast = inject(AppToastService);

  protected readonly ui = inject(UiTextService).localized(getLmsLessonEditUiText);
  protected readonly common = inject(UiTextService).localized(getLmsCommonUiText);

  protected readonly lessonId = signal(0);
  protected readonly blocks = signal<ContentBlock[]>([]);
  protected readonly availableLangs = signal<string[]>(['fr', 'en']);

  protected readonly blockIcons = BLOCK_ICONS;
  protected readonly blockTypes: ReadonlyArray<{value: BlockType}> = [
    {value: 'rich_text'}, {value: 'image'}, {value: 'video'},
    {value: 'file'}, {value: 'quiz'}, {value: 'callout'},
    {value: 'code'}, {value: 'embed'},
  ];

  /** True when the route resolved to a valid lesson id. */
  protected readonly hasLesson = computed(() => this.lessonId() > 0);

  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/lms`;
  private routeSub: Subscription | null = null;

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const raw = params.get('id');
      const parsed = raw !== null ? Number(raw) : NaN;
      if (!Number.isFinite(parsed) || parsed <= 0) {
        this.lessonId.set(0);
        this.blocks.set([]);
        return;
      }
      this.lessonId.set(parsed);
      this.reload();
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.routeSub = null;
  }

  protected reload(): void {
    const id = this.lessonId();
    if (id <= 0) {
      return;
    }
    this.http.get<LessonDetailDto>(`${this.apiBaseUrl}/lesson/${id}/`).subscribe({
      next: (lesson) => {
        this.blocks.set(lesson.blocks ?? []);
        this.availableLangs.set(
          lesson.available_lang_codes && lesson.available_lang_codes.length > 0
            ? lesson.available_lang_codes
            : ['fr', 'en'],
        );
      },
      error: (err: unknown) => {
        logApiError('lms.lesson-edit.load', err);
        this.toast.addApiError(err, this.ui().blockErrorToast);
      },
    });
  }

  protected addBlock(type: BlockType): void {
    const order = this.blocks().length;
    this.http.post(`${this.apiBaseUrl}/block/`, {
      lesson: this.lessonId(),
      block_type: type,
      order,
      translations: {},
    }).subscribe({
      next: () => {
        this.reload();
        this.toast.add({severity: 'success', summary: this.ui().blockAddedToast});
      },
      error: (err: unknown) => {
        logApiError('lms.lesson-edit.add', err);
        this.toast.addApiError(err, this.ui().blockErrorToast);
      },
    });
  }

  protected deleteBlock(id: number): void {
    this.http.delete(`${this.apiBaseUrl}/block/${id}/`).subscribe({
      next: () => {
        this.reload();
        this.toast.add({severity: 'success', summary: this.ui().blockDeletedToast});
      },
      error: (err: unknown) => {
        logApiError('lms.lesson-edit.delete', err);
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
    this.blocks.set(list);
    this.catalog.reorderBlocks(this.lessonId(), list.map((b) => b.id)).subscribe({
      next: () => this.toast.add({severity: 'success', summary: this.ui().reorderSuccessToast}),
      error: (err: unknown) => {
        logApiError('lms.lesson-edit.reorder', err);
        this.toast.addApiError(err, this.ui().reorderErrorToast);
      },
    });
  }

  protected onBlockChanged(blockId: number, patch: Partial<ContentBlock>): void {
    this.http.patch(`${this.apiBaseUrl}/block/${blockId}/`, patch).subscribe({
      next: () => {
        // Reflect the patch locally so a subsequent debounced patch starts
        // from the freshly-applied state without forcing a full reload.
        this.blocks.update((list) =>
          list.map((b) => (b.id === blockId ? {...b, ...patch} : b)),
        );
      },
      error: (err: unknown) => {
        logApiError('lms.lesson-edit.patch', err);
        this.toast.addApiError(err, this.ui().blockErrorToast);
      },
    });
  }
}
