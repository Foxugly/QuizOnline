import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {CdkDragDrop, DragDropModule, moveItemInArray} from '@angular/cdk/drag-drop';
import {ButtonModule} from 'primeng/button';
import {Subscription} from 'rxjs';

import {LMS_CATALOG, LMS_COURSE_EDIT, LMS_LESSON_VIEW} from '../../../app.routes-paths';
import {logApiError} from '../../../shared/api/api-errors';
import {resolveApiBaseUrl} from '../../../shared/api/runtime-api-base-url';
import {PageHeader} from '../../../shared/components/page-header/page-header';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {AppToastService} from '../../../shared/toast/app-toast.service';
import {UserService} from '../../../services/user/user';
import {LmsCatalogService} from '../../../services/lms/lms-catalog.service';
import {ContentBlock} from '../../../shared/lms/content-block.types';
import {BLOCK_ICONS} from '../../../shared/lms/block-icons';
import {BlockType, getLmsCommonUiText} from '../../../shared/lms/lms-common.i18n';
import {pickTranslation} from '../../../shared/lms/lms-translations';

import {getLmsLessonEditUiText} from './lesson-edit.i18n';
import {SavedIndicator} from './block-editors/saved-indicator';
import {RichTextBlockEditor} from './block-editors/rich-text-block-editor';
import {ImageBlockEditor} from './block-editors/image-block-editor';
import {VideoBlockEditor} from './block-editors/video-block-editor';
import {FileBlockEditor} from './block-editors/file-block-editor';
import {QuizBlockEditor} from './block-editors/quiz-block-editor';
import {CalloutBlockEditor} from './block-editors/callout-block-editor';
import {CodeBlockEditor} from './block-editors/code-block-editor';
import {EmbedBlockEditor} from './block-editors/embed-block-editor';

// Block renderers reused from the learner-facing lesson-view so the
// in-page "Preview" toggle shows exactly what the learner sees.
import {RichTextBlockRenderer} from '../lesson-view/block-renderers/rich-text-block-renderer';
import {ImageBlockRenderer} from '../lesson-view/block-renderers/image-block-renderer';
import {VideoBlockRenderer} from '../lesson-view/block-renderers/video-block-renderer';
import {FileBlockRenderer} from '../lesson-view/block-renderers/file-block-renderer';
import {QuizBlockRenderer} from '../lesson-view/block-renderers/quiz-block-renderer';
import {CalloutBlockRenderer} from '../lesson-view/block-renderers/callout-block-renderer';
import {CodeBlockRenderer} from '../lesson-view/block-renderers/code-block-renderer';
import {EmbedBlockRenderer} from '../lesson-view/block-renderers/embed-block-renderer';

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
  domain_id?: number;
}

/** Shape consumed by the left-side block outline in preview mode —
 *  mirrors the lesson-view ``BlockOutlineItem`` so authors see the
 *  same navigation experience as their learners. */
interface BlockOutlineItem {
  id: number;
  label: string;
  icon: string;
  anchor: string;
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
    RouterLink,
    DragDropModule,
    ButtonModule,
    PageHeader,
    SavedIndicator,
    RichTextBlockEditor,
    ImageBlockEditor,
    VideoBlockEditor,
    FileBlockEditor,
    QuizBlockEditor,
    CalloutBlockEditor,
    CodeBlockEditor,
    EmbedBlockEditor,
    RichTextBlockRenderer,
    ImageBlockRenderer,
    VideoBlockRenderer,
    FileBlockRenderer,
    QuizBlockRenderer,
    CalloutBlockRenderer,
    CodeBlockRenderer,
    EmbedBlockRenderer,
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
  private readonly userService = inject(UserService);
  protected readonly currentLang = this.userService.lang;

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
  /** Domain id of the parent course — drives the quiz-block-editor
   *  template picker so authors only see templates from the right
   *  domain. ``0`` while loading. */
  protected readonly domainId = signal(0);
  /** Map of ``blockId -> lastSavedAt`` updated after every successful
   *  PATCH. The block-header consumes it via ``<app-saved-indicator>``
   *  so the author sees a "Saved at HH:MM" hint without opening the
   *  network panel. ``Map`` value is a millisecond epoch — we build a
   *  fresh ``Date`` at render time so the indicator stays serializable
   *  even when the map is recreated on every signal update. */
  protected readonly lastSavedAt = signal<Map<number, number>>(new Map());

  protected readonly blockIcons = BLOCK_ICONS;
  protected readonly blockTypes: ReadonlyArray<{value: BlockType}> = [
    {value: 'rich_text'}, {value: 'image'}, {value: 'video'},
    {value: 'file'}, {value: 'quiz'}, {value: 'callout'},
    {value: 'code'}, {value: 'embed'},
  ];

  /** True when the route resolved to a valid lesson id. */
  protected readonly hasLesson = computed(() => this.lessonId() > 0);

  /** Public lesson-view route — drives the top-right "view as learner"
   *  eye button so an author can jump from the editor to the rendered
   *  learner experience in one click. ``null`` while the route id is
   *  still being parsed. */
  protected readonly viewHref = computed<string | null>(() => {
    const id = this.lessonId();
    return id > 0 ? LMS_LESSON_VIEW(id) : null;
  });

  /** Toggle between the per-type editors and the in-page learner
   *  preview. The preview reuses the lesson-view block renderers so
   *  the author sees the exact same render the apprenant gets,
   *  without a route change or a tab. */
  protected readonly previewMode = signal(false);
  protected togglePreview(): void {
    this.previewMode.update((v) => !v);
  }

  /** Outline entries derived from the blocks list — feeds the
   *  left-side sticky navigation rendered in preview mode. Label
   *  prefers the block's own translated ``title`` and falls back to
   *  the localised block-type name (e.g. "Texte enrichi"). Same
   *  shape and resolution rules as lesson-view's outline so the
   *  author preview matches the learner view exactly. */
  protected readonly outline = computed<BlockOutlineItem[]>(() => {
    const labels = this.common().blockTypeLabels;
    const lang = this.currentLang();
    return this.blocks().map((b) => {
      const customTitle = pickTranslation(b.translations, lang, 'title')?.trim();
      return {
        id: b.id,
        label: customTitle || labels[b.block_type] || b.block_type,
        icon: BLOCK_ICONS[b.block_type] ?? 'pi pi-file',
        anchor: `block-${b.id}`,
      };
    });
  });

  /** Absolute href for a block anchor — combines the current path
   *  with ``#anchor`` so the browser's link preview / right-click
   *  "copy link" produce ``/lms/lesson/{id}/edit#block-X`` instead
   *  of the SPA root (``<base href="/">`` would otherwise collapse
   *  a bare ``#anchor`` to ``/#anchor``). */
  protected anchorHref(anchor: string): string {
    return `${location.pathname}${location.search}#${anchor}`;
  }

  /** Smooth-scroll to a block by anchor. Plain ``<a href="#x">`` is
   *  intercepted by the Angular Router and teleports to the home
   *  route — we handle the click ourselves to stay in-page and get
   *  smooth scrolling for free. */
  protected scrollToBlock(event: MouseEvent, anchor: string): void {
    event.preventDefault();
    const target = document.getElementById(anchor);
    if (!target) {
      return;
    }
    target.scrollIntoView({behavior: 'smooth', block: 'start'});
    history.replaceState(history.state, '', this.anchorHref(anchor));
  }

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
        const parsedDomainId =
          typeof lesson.domain_id === 'number' && Number.isFinite(lesson.domain_id) && lesson.domain_id > 0
            ? lesson.domain_id
            : 0;
        this.domainId.set(parsedDomainId);
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
    // Pick max(existing order) + 1 rather than ``blocks.length`` so a
    // sparse server-side ordering (left behind by a delete in the
    // middle) cannot collide with the UNIQUE(lesson, order) constraint
    // — that would surface as a 400 from the next POST.
    const existing = this.blocks().map((b) => b.order);
    const order = existing.length > 0 ? Math.max(...existing) + 1 : 0;
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

  /** Build a fresh ``Date`` for the saved-at indicator of ``blockId``,
   *  or ``null`` when no save has happened yet. Returns ``null`` early
   *  so a brand-new block (just added, no PATCH yet) reads as
   *  unsaved instead of "Saved at 1970-01-01". */
  protected savedAtFor(blockId: number): Date | null {
    const ts = this.lastSavedAt().get(blockId);
    return ts ? new Date(ts) : null;
  }

  protected onBlockChanged(blockId: number, patch: Partial<ContentBlock>): void {
    this.http.patch(`${this.apiBaseUrl}/block/${blockId}/`, patch).subscribe({
      next: () => {
        // Reflect the patch locally so a subsequent debounced patch starts
        // from the freshly-applied state without forcing a full reload.
        this.blocks.update((list) =>
          list.map((b) => (b.id === blockId ? {...b, ...patch} : b)),
        );
        // Stamp the save so the block-header can render its
        // "Saved at HH:MM" hint without a round-trip through reload().
        this.lastSavedAt.update((m) => {
          const next = new Map(m);
          next.set(blockId, Date.now());
          return next;
        });
      },
      error: (err: unknown) => {
        logApiError('lms.lesson-edit.patch', err);
        this.toast.addApiError(err, this.ui().blockErrorToast);
      },
    });
  }
}
