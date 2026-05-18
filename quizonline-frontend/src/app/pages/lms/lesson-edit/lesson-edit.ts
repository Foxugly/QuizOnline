import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute, Router} from '@angular/router';
import {CdkDragDrop, DragDropModule, moveItemInArray} from '@angular/cdk/drag-drop';
import {ButtonModule} from 'primeng/button';
import {Subscription} from 'rxjs';

import {LMS_CATALOG, LMS_COURSE_EDIT} from '../../../app.routes-paths';
import {logApiError} from '../../../shared/api/api-errors';
import {resolveApiBaseUrl} from '../../../shared/api/runtime-api-base-url';
import {isEmptyRichText} from '../../../shared/html/is-empty-rich-text';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {AppToastService} from '../../../shared/toast/app-toast.service';
import {LmsCatalogService} from '../../../services/lms/lms-catalog.service';
import {TranslateBatchItem, TranslationService} from '../../../services/translation/translation';
import {UserService} from '../../../services/user/user';
import {ContentBlock} from '../../../shared/lms/content-block.types';
import {BLOCK_ICONS} from '../../../shared/lms/block-icons';
import {BlockType, getLmsCommonUiText} from '../../../shared/lms/lms-common.i18n';
import {TranslationsMap} from '../../../shared/lms/lms-translations';

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
 * ordered list of blocks, the parent course's ``available_lang_codes``
 * which gates which language tabs every translatable block editor
 * renders, and the ``course_id`` used by the header back-button to
 * route the author back to the parent course-edit page.
 */
interface LessonDetailDto {
  id: number;
  blocks?: ContentBlock[];
  available_lang_codes?: string[];
  course_id?: number;
}

/**
 * Translatable fields per block type, with the format the translation
 * backend expects so HTML body fields preserve their markup while plain
 * titles/captions are translated as text. Block types with no entries
 * (``quiz``, ``code``) are skipped by ``translateAll()``.
 */
const TRANSLATABLE_FIELDS: Record<BlockType, ReadonlyArray<{key: string; format: 'text' | 'html'}>> = {
  rich_text: [{key: 'rich_text', format: 'html'}],
  image: [{key: 'title', format: 'text'}],
  video: [{key: 'title', format: 'text'}],
  file: [{key: 'title', format: 'text'}],
  quiz: [],
  callout: [{key: 'title', format: 'text'}, {key: 'callout_text', format: 'text'}],
  code: [],
  embed: [{key: 'title', format: 'text'}],
};

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
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly catalog = inject(LmsCatalogService);
  private readonly toast = inject(AppToastService);
  private readonly translator = inject(TranslationService);
  private readonly userService = inject(UserService);

  private readonly uiSvc = inject(UiTextService);
  protected readonly ui = this.uiSvc.localized(getLmsLessonEditUiText);
  protected readonly common = this.uiSvc.localized(getLmsCommonUiText);
  /** Editor-scoped UI dictionary, used for ``common.back`` on the header back button. */
  protected readonly editorUi = this.uiSvc.editor;

  protected readonly lessonId = signal(0);
  protected readonly blocks = signal<ContentBlock[]>([]);
  protected readonly availableLangs = signal<string[]>(['fr', 'en']);
  /**
   * Parent course id, sourced from ``GET /api/lms/lesson/{id}/`` so the
   * header back-button can route the author back to the parent course
   * editor. ``0`` while loading or if the field is unexpectedly absent
   * — in that case ``back()`` falls back to the LMS catalog.
   */
  protected readonly courseId = signal(0);
  /** True while a "translate all" run is in flight — disables the button to prevent overlapping runs. */
  protected readonly translating = signal(false);

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
        const parsedCourseId =
          typeof lesson.course_id === 'number' && Number.isFinite(lesson.course_id) && lesson.course_id > 0
            ? lesson.course_id
            : 0;
        this.courseId.set(parsedCourseId);
      },
      error: (err: unknown) => {
        logApiError('lms.lesson-edit.load', err);
        this.toast.addApiError(err, this.ui().blockErrorToast);
      },
    });
  }

  /**
   * Navigate back to the parent course-edit page. When the lesson detail
   * has not yet resolved a valid ``course_id`` (e.g. mid-reload or a
   * backend regression), fall back to the LMS catalog so the user is
   * never stranded.
   */
  protected back(): void {
    const cid = this.courseId();
    this.router.navigateByUrl(cid > 0 ? LMS_COURSE_EDIT(cid) : LMS_CATALOG);
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

  /**
   * Auto-fill empty per-language slots on every translatable block,
   * using the user's current UI language as the source. Mirrors the
   * info-tab behaviour: only blanks are filled, never overwritten.
   * Quiz and code blocks have no translatable fields and are skipped.
   */
  protected async translateAll(): Promise<void> {
    if (this.translating()) {
      return;
    }
    const source = this.userService.lang();
    const targets = this.availableLangs().filter((l) => l !== source);
    if (!targets.length) {
      return;
    }

    this.translating.set(true);
    try {
      for (const block of this.blocks()) {
        const fields = TRANSLATABLE_FIELDS[block.block_type];
        if (!fields.length) {
          continue;
        }
        const merged: TranslationsMap = {...(block.translations ?? {})};
        let touched = false;
        for (const target of targets) {
          const items: TranslateBatchItem[] = [];
          for (const f of fields) {
            const targetVal = (merged[target]?.[f.key] ?? '').toString();
            const isBlank = f.format === 'html' ? isEmptyRichText(targetVal) : !targetVal.trim();
            if (!isBlank) {
              continue;
            }
            const sourceVal = (merged[source]?.[f.key] ?? '').toString();
            const sourceBlank = f.format === 'html' ? isEmptyRichText(sourceVal) : !sourceVal.trim();
            if (sourceBlank) {
              continue;
            }
            items.push({key: f.key, text: sourceVal, format: f.format});
          }
          if (!items.length) {
            continue;
          }
          const out = await this.translator.translateBatch(source, target, items);
          const targetGroup = {...(merged[target] ?? {})};
          for (const f of fields) {
            const v = out[f.key];
            if (v !== undefined) {
              targetGroup[f.key] = v;
              touched = true;
            }
          }
          merged[target] = targetGroup;
        }
        if (touched) {
          this.onBlockChanged(block.id, {translations: merged});
        }
      }
      this.toast.add({severity: 'success', summary: this.ui().translateSuccessToast});
    } catch (err) {
      logApiError('lms.lesson-edit.translate', err);
      this.toast.addApiError(err, this.ui().translateErrorToast);
    } finally {
      this.translating.set(false);
    }
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
