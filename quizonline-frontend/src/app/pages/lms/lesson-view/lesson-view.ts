import {ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute} from '@angular/router';
import {Subscription} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {TagModule} from 'primeng/tag';

import {logApiError} from '../../../shared/api/api-errors';
import {resolveApiBaseUrl} from '../../../shared/api/runtime-api-base-url';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../shared/lms/content-block.types';
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
}

@Component({
  selector: 'app-lms-lesson-view',
  imports: [
    ButtonModule,
    TagModule,
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
