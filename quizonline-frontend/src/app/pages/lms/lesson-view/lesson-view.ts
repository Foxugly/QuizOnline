import {ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {Subscription} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {TagModule} from 'primeng/tag';

import {LMS_CATALOG, LMS_COURSE_DETAIL, LMS_LESSON_EDIT, LMS_LESSON_VIEW} from '../../../app.routes-paths';
import {logApiError} from '../../../shared/api/api-errors';
import {resolveApiBaseUrl} from '../../../shared/api/runtime-api-base-url';
import {PageHeader} from '../../../shared/components/page-header/page-header';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {BLOCK_ICONS} from '../../../shared/lms/block-icons';
import {ContentBlock} from '../../../shared/lms/content-block.types';
import {getLmsCommonUiText} from '../../../shared/lms/lms-common.i18n';
import {pickTranslation, type TranslationsMap} from '../../../shared/lms/lms-translations';
import {AppToastService} from '../../../shared/toast/app-toast.service';
import {LmsEnrollmentService} from '../../../services/lms/lms-enrollment.service';
import {UserService} from '../../../services/user/user';

import {RichTextBlockRenderer} from './block-renderers/rich-text-block-renderer';
import {ImageBlockRenderer} from './block-renderers/image-block-renderer';
import {VideoBlockRenderer} from './block-renderers/video-block-renderer';
import {FileBlockRenderer} from './block-renderers/file-block-renderer';
import {QuizBlockRenderer} from './block-renderers/quiz-block-renderer';
import {CalloutBlockRenderer} from './block-renderers/callout-block-renderer';
import {CodeBlockRenderer} from './block-renderers/code-block-renderer';
import {EmbedBlockRenderer} from './block-renderers/embed-block-renderer';
import {getLmsLessonViewUiText} from './lesson-view.i18n';

/**
 * Shape consumed from ``GET /api/lms/lesson/{id}/``. The backend
 * serializer nests blocks under ``blocks`` ordered by ``order`` and
 * surfaces a ``completed`` flag derived from the caller's progress row —
 * we treat both fields as optional so the page degrades gracefully if
 * the serializer ever changes.
 */
interface LessonDetailDto {
  id: number;
  translations?: TranslationsMap;
  blocks?: ContentBlock[];
  completed?: boolean;
  course_slug?: string;
  course_id?: number;
  can_manage?: boolean;
  prev_lesson?: {id: number; title: string} | null;
  next_lesson?: {id: number; title: string} | null;
}

interface BlockOutlineItem {
  id: number;
  label: string;
  icon: string;
  anchor: string;
}

@Component({
  selector: 'app-lms-lesson-view',
  imports: [
    RouterLink,
    ButtonModule,
    TagModule,
    PageHeader,
    RichTextBlockRenderer,
    ImageBlockRenderer,
    VideoBlockRenderer,
    FileBlockRenderer,
    QuizBlockRenderer,
    CalloutBlockRenderer,
    CodeBlockRenderer,
    EmbedBlockRenderer,
  ],
  templateUrl: './lesson-view.html',
  styleUrl: './lesson-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsLessonView implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly enrollment = inject(LmsEnrollmentService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(AppToastService);
  private readonly uiSvc = inject(UiTextService);

  protected readonly ui = this.uiSvc.localized(getLmsLessonViewUiText);
  /** Shared "Back" label — same source as every other LMS page. */
  protected readonly editorUi = this.uiSvc.editor;
  /** Localized block-type labels used for the left-side outline. */
  protected readonly common = this.uiSvc.localized(getLmsCommonUiText);
  protected readonly currentLang = this.userService.lang;

  protected readonly lesson = signal<LessonDetailDto | null>(null);
  protected readonly completing = signal(false);

  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/lms`;
  private routeSub: Subscription | null = null;

  protected readonly title = computed(() =>
    pickTranslation(this.lesson()?.translations, this.currentLang(), 'title'),
  );

  protected readonly blocks = computed<ContentBlock[]>(() => this.lesson()?.blocks ?? []);

  protected readonly isCompleted = computed(() => this.lesson()?.completed === true);

  protected readonly canManage = computed(() => this.lesson()?.can_manage === true);

  /** Anchor href that takes the user back to the parent course detail page.
   *  Falls back to the catalog when the lesson detail has not yet exposed a
   *  ``course_slug`` (mid-load or a backend regression). */
  protected readonly backHref = computed<string>(() => {
    const slug = this.lesson()?.course_slug;
    return slug ? LMS_COURSE_DETAIL(slug) : LMS_CATALOG;
  });

  /** Lesson-edit route for the right-side "Edit" affordance, gated by ``canManage``. */
  protected readonly editHref = computed<string | null>(() => {
    if (!this.canManage()) {
      return null;
    }
    const id = this.lesson()?.id;
    return id ? LMS_LESSON_EDIT(id) : null;
  });

  /** Neighbouring-lesson view-models for the footer prev/next buttons.
   *  ``null`` at the course boundary — the template hides the button. */
  protected readonly prevLesson = computed(() => this.lesson()?.prev_lesson ?? null);
  protected readonly nextLesson = computed(() => this.lesson()?.next_lesson ?? null);

  protected lessonHref(id: number): ReturnType<typeof LMS_LESSON_VIEW> {
    return LMS_LESSON_VIEW(id);
  }

  /** One outline entry per block. The label is the block's own
   *  translated ``title`` when available, falling back to the
   *  ``block_type`` localized name (e.g. "Texte enrichi"). Anchor is a
   *  stable ``block-<id>`` consumed by both the ``[id]`` on the block
   *  card and the side-nav ``href``. */
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

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const idRaw = params.get('id');
      const id = idRaw !== null ? Number(idRaw) : NaN;
      if (!Number.isFinite(id) || id <= 0) {
        this.lesson.set(null);
        return;
      }
      this.loadLesson(id);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.routeSub = null;
  }

  /** Absolute href for a block anchor — combines the current
   *  ``location.pathname`` (+ optional query string) with ``#anchor``
   *  so the browser's link preview / copy-link / right-click menu
   *  produce ``/lms/lesson/{id}#block-X`` instead of the SPA root
   *  (``<base href="/">`` would otherwise resolve a bare ``#anchor``
   *  to ``/#anchor``). */
  protected anchorHref(anchor: string): string {
    return `${location.pathname}${location.search}#${anchor}`;
  }

  /**
   * Scroll to the target ``#block-<id>`` anchor on the current page.
   *
   * Plain ``<a href="#block-1">`` would also be intercepted by the
   * Angular Router as a navigation to ``/#block-1`` — the empty path
   * matched the home route and teleported the learner away. Handling
   * the click manually keeps the navigation SPA-local and gives us
   * smooth scrolling for free.
   */
  protected scrollToBlock(event: MouseEvent, anchor: string): void {
    event.preventDefault();
    const target = document.getElementById(anchor);
    if (!target) {
      return;
    }
    target.scrollIntoView({behavior: 'smooth', block: 'start'});
    // Keep the URL fragment in sync so the back/forward stack works
    // and the user can copy a deep-link to a specific block. Use an
    // absolute path so the document ``<base href>`` does not collapse
    // the URL to ``/#anchor``.
    history.replaceState(history.state, '', this.anchorHref(anchor));
  }

  protected completeLesson(): void {
    const current = this.lesson();
    if (!current || this.completing()) {
      return;
    }
    this.completing.set(true);
    this.enrollment.completeLesson(current.id, 100).subscribe({
      next: () => {
        this.lesson.update((l) => (l ? {...l, completed: true} : l));
        this.toast.add({severity: 'success', summary: this.ui().lessonCompletedToast});
      },
      error: (err: unknown) => {
        logApiError('lms.lesson-view.complete', err);
        this.toast.addApiError(err, this.ui().lessonCompletedErrorToast);
      },
      complete: () => this.completing.set(false),
    });
  }

  private loadLesson(id: number): void {
    this.http.get<LessonDetailDto>(`${this.apiBaseUrl}/lesson/${id}/`).subscribe({
      next: (detail) => {
        this.lesson.set(detail);
        this.enrollment.startLesson(id).subscribe({
          error: (err: unknown) => logApiError('lms.lesson-view.start', err),
        });
      },
      error: (err: unknown) => {
        logApiError('lms.lesson-view.load', err);
        this.lesson.set(null);
      },
    });
  }
}
