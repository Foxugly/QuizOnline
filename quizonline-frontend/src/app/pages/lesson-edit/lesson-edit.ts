import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute, Router} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {Subscription} from 'rxjs';

import {CATALOG, COURSE_EDIT} from '../../app.routes-paths';
import {logApiError} from '../../shared/api/api-errors';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';
import {PageHeader} from '../../shared/components/page-header/page-header';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {AppToastService} from '../../shared/toast/app-toast.service';
import {ContentBlock} from '../../shared/learning/content-block.types';

import {BlockListEditor} from '../../shared/learning/block-list-editor/block-list-editor';
import {LessonReader} from '../../shared/learning/lesson-reader/lesson-reader';

import {getLessonEditUiText} from './lesson-edit.i18n';

/**
 * Shape consumed from ``GET /api/lesson/{id}/``. Mirrors the
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

/**
 * Lesson-author shell: ordered list of content blocks with
 * ``@angular/cdk`` drag-and-drop reorder, per-type editor host, and
 * an "add block" bar at the bottom. Every mutating endpoint is hit
 * via ``HttpClient + resolveApiBaseUrl()`` to match the rest of the
 * LMS pages; reorder funnels through :class:`CatalogService`
 * which already knows the bulk-reorder route.
 *
 * Preview mode reuses the shared ``<app-lesson-reader>`` component
 * (without scroll-spy) so the outline + body render verbatim the
 * same way as the learner-facing ``/lesson/{id}`` page — same anchors,
 * same outline derivation, same block card visuals.
 */
@Component({
  selector: 'app-lesson-edit',
  imports: [
    ButtonModule,
    PageHeader,
    BlockListEditor,
    LessonReader,
  ],
  templateUrl: './lesson-edit.html',
  styleUrl: './lesson-edit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonEdit implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(AppToastService);

  private readonly uiSvc = inject(UiTextService);
  protected readonly ui = this.uiSvc.localized(getLessonEditUiText);
  /** Editor-scoped UI dictionary, used for ``common.back`` on the header back button. */
  protected readonly editorUi = this.uiSvc.editor;

  protected readonly lessonId = signal(0);
  protected readonly blocks = signal<ContentBlock[]>([]);
  protected readonly availableLangs = signal<string[]>(['fr', 'en']);
  /**
   * Parent course id, sourced from ``GET /api/lesson/{id}/`` so the
   * header back-button can route the author back to the parent course
   * editor. ``0`` while loading or if the field is unexpectedly absent
   * — in that case ``back()`` falls back to the LMS catalog.
   */
  protected readonly courseId = signal(0);
  /** Domain id of the parent course — drives the quiz-block-editor
   *  template picker so authors only see templates from the right
   *  domain. ``0`` while loading. */
  protected readonly domainId = signal(0);

  /** True when the route resolved to a valid lesson id. */
  protected readonly hasLesson = computed(() => this.lessonId() > 0);

  /** Toggle between the per-type editors and the in-page learner
   *  preview. The preview reuses ``<app-lesson-reader>`` so the
   *  author sees the exact same render the apprenant gets — without
   *  a route change or a tab. */
  protected readonly previewMode = signal(false);
  protected togglePreview(): void {
    this.previewMode.update((v) => !v);
  }

  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api`;
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
    this.router.navigateByUrl(cid > 0 ? COURSE_EDIT(cid) : CATALOG);
  }

  /**
   * Callback fired by ``<app-block-list-editor>`` after a STRUCTURAL
   * mutation (add / delete / reorder). Refetch the lesson so the
   * outline and preview reflect the new state. PATCH-only payload
   * updates take the cheaper ``onBlockUpdated`` path below.
   */
  protected onBlocksChanged(): void {
    this.reload();
  }

  /** Per-block PATCH succeeded server-side. Merge the response
   *  into the local ``blocks`` signal by id instead of refetching
   *  the whole lesson — the outline + preview read through the same
   *  signal and re-render automatically. */
  protected onBlockUpdated(updated: ContentBlock): void {
    this.blocks.update((list) =>
      list.map((b) => (b.id === updated.id ? updated : b)),
    );
  }
}
