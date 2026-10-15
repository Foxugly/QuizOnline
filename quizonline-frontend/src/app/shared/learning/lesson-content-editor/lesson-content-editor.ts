import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ButtonModule} from 'primeng/button';
import {InputTextModule} from 'primeng/inputtext';
import {TooltipModule} from 'primeng/tooltip';

import {resolveApiBaseUrl} from '../../api/runtime-api-base-url';
import {logApiError} from '../../api/api-errors';
import {StatusBadgeComponent} from '../../components/status-badge/status-badge';
import {UiTextService} from '../../i18n/ui-text.service';
import {AppToastService} from '../../toast/app-toast.service';
import {CatalogService} from '../../../services/catalog/catalog.service';
import {BlockListEditor} from '../block-list-editor/block-list-editor';
import {ContentBlock} from '../content-block.types';
import {LessonReader} from '../lesson-reader/lesson-reader';

import {getLessonContentEditorUiText} from './lesson-content-editor.i18n';

interface LessonRef {
  id: number;
  title: string;
}

/**
 * Shape consumed from ``GET /api/v1/lesson/{id}/`` (subset the editor
 * cares about).
 */
interface LessonDetailDto {
  id: number;
  blocks?: ContentBlock[];
  available_lang_codes?: string[];
  course_id?: number;
  domain_id?: number;
  translations?: Record<string, {title?: string} | undefined>;
  is_published?: boolean;
  is_preview?: boolean;
  prev_lesson?: LessonRef | null;
  next_lesson?: LessonRef | null;
}

/**
 * Lesson content editor: header (title with inline rename, publish badge,
 * prev / next, preview toggle) + block-list editor or learner preview.
 * Embedded in the right pane of the course editor; reloads whenever
 * ``lessonId`` changes.
 */
@Component({
  selector: 'app-lesson-content-editor',
  imports: [ButtonModule, InputTextModule, TooltipModule, StatusBadgeComponent, BlockListEditor, LessonReader],
  templateUrl: './lesson-content-editor.html',
  styleUrl: './lesson-content-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonContentEditor {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(AppToastService);
  private readonly catalog = inject(CatalogService);
  private readonly uiSvc = inject(UiTextService);

  protected readonly ui = this.uiSvc.localized(getLessonContentEditorUiText);
  protected readonly shellUi = this.uiSvc.ui;

  readonly lessonId = input.required<number>();
  readonly courseLanguage = input<string>('fr');

  /** Emitted after a successful inline rename. */
  readonly titleChanged = output<{id: number; title: string}>();
  /** Previous / next lesson id requested by the header chevrons. */
  readonly navigate = output<number>();

  protected readonly lesson = signal<LessonDetailDto | null>(null);
  protected readonly blocks = signal<ContentBlock[]>([]);
  protected readonly availableLangs = signal<string[]>(['fr', 'en']);
  protected readonly domainId = signal(0);
  protected readonly previewMode = signal(false);

  protected readonly renaming = signal(false);
  protected readonly draftTitle = signal('');
  private readonly blockList = viewChild(BlockListEditor);
  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/v1`;

  constructor() {
    effect(() => {
      const id = this.lessonId();
      untracked(() => {
        this.renaming.set(false);
        // Drop the previous lesson's blocks at once: the block list resets
        // its edit state on the new ``hostId`` and must not show stale rows.
        this.lesson.set(null);
        this.blocks.set([]);
        if (id > 0) {
          this.reload(id);
        }
      });
    });
    effect(() => {
      if (this.renaming()) {
        const el = this.titleInput()?.nativeElement;
        el?.focus();
        el?.select();
      }
    });
  }

  /** True while a block of this lesson is open in edit mode. */
  hasUnsavedChanges(): boolean {
    return this.blockList()?.hasUnsavedChanges() ?? false;
  }

  /** Title in the course language, else the first non-empty translation. */
  protected title(): string {
    const translations = this.lesson()?.translations;
    if (!translations) {
      return '';
    }
    const own = translations[this.courseLanguage()]?.title;
    if (own) {
      return own;
    }
    return Object.values(translations).find((t) => !!t?.title)?.title ?? '';
  }

  protected togglePreview(): void {
    this.previewMode.update((v) => !v);
  }

  protected reload(id: number = this.lessonId()): void {
    if (id <= 0) {
      return;
    }
    // ``no-cache``: lesson retrieve carries ``Cache-Control: private, max-age=30``
    // (``ShortReadCacheMixin``). Without revalidation the refetch that follows a
    // block add / delete / reorder is served from the browser cache and the
    // new block never shows up.
    this.http.get<LessonDetailDto>(`${this.apiBaseUrl}/lesson/${id}/`, {cache: 'no-cache'}).subscribe({
      next: (lesson) => {
        if (id !== this.lessonId()) {
          return; // stale response: the author already moved to another lesson
        }
        this.lesson.set(lesson);
        this.blocks.set(lesson.blocks ?? []);
        this.availableLangs.set(
          lesson.available_lang_codes && lesson.available_lang_codes.length > 0
            ? lesson.available_lang_codes
            : ['fr', 'en'],
        );
        this.domainId.set(
          typeof lesson.domain_id === 'number' && Number.isFinite(lesson.domain_id) && lesson.domain_id > 0
            ? lesson.domain_id
            : 0,
        );
      },
      error: (err: unknown) => {
        logApiError('lms.lesson-content-editor.load', err);
        this.toast.addApiError(err, this.ui().blockErrorToast);
      },
    });
  }

  protected startRename(): void {
    this.draftTitle.set(this.title());
    this.renaming.set(true);
  }

  protected cancelRename(): void {
    this.renaming.set(false);
  }

  protected commitRename(): void {
    const title = this.draftTitle().trim();
    const id = this.lessonId();
    this.renaming.set(false);
    if (!title || title === this.title()) {
      return;
    }
    this.catalog
      .updateLesson(id, {translations: {[this.courseLanguage()]: {title}}})
      .subscribe({
        next: (res) => {
          if (id !== this.lessonId()) {
            return;
          }
          this.lesson.update((current) => ({
            ...(current ?? {id}),
            ...((res as Partial<LessonDetailDto> | null) ?? {}),
          }));
          this.titleChanged.emit({id, title});
        },
        error: (err: unknown) => {
          logApiError('lms.lesson-content-editor.rename', err);
          this.toast.addApiError(err, this.ui().blockErrorToast);
        },
      });
  }

  /** STRUCTURAL block mutation (add / delete / reorder): refetch. */
  protected onBlocksChanged(): void {
    this.reload();
  }

  /** Per-block PATCH succeeded: merge by id instead of refetching. */
  protected onBlockUpdated(updated: ContentBlock): void {
    this.blocks.update((list) => list.map((b) => (b.id === updated.id ? updated : b)));
  }
}
