import {ChangeDetectionStrategy, Component, ElementRef, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {Subject, Subscription, debounceTime} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {TagModule} from 'primeng/tag';
import {TextareaModule} from 'primeng/textarea';
import {TooltipModule} from 'primeng/tooltip';
import {FormsModule} from '@angular/forms';

import {CATALOG, COURSE_DETAIL, LESSON_EDIT, LESSON_VIEW} from '../../app.routes-paths';
import {logApiError} from '../../shared/api/api-errors';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';
import {LoadingSkeleton} from '../../shared/components/loading-skeleton/loading-skeleton';
import {PageHeader} from '../../shared/components/page-header/page-header';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../shared/learning/content-block.types';
import {pickTranslation, type TranslationsMap} from '../../shared/learning/learning-translations';
import {AppToastService} from '../../shared/toast/app-toast.service';
import {EnrollmentService} from '../../services/enrollment/enrollment.service';
import {UserService} from '../../services/user/user';

import {LessonReader} from '../../shared/learning/lesson-reader/lesson-reader';
import {getLessonViewUiText} from './lesson-view.i18n';

/**
 * Shape consumed from ``GET /api/lesson/{id}/``. The backend
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
  section_title?: string;
  position_in_section?: {current: number; total: number};
}

@Component({
  selector: 'app-lesson-view',
  imports: [
    RouterLink,
    FormsModule,
    ButtonModule,
    TagModule,
    TextareaModule,
    TooltipModule,
    LoadingSkeleton,
    PageHeader,
    LessonReader,
  ],
  templateUrl: './lesson-view.html',
  styleUrl: './lesson-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonView implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly enrollment = inject(EnrollmentService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(AppToastService);
  private readonly uiSvc = inject(UiTextService);
  private readonly hostElement: ElementRef<HTMLElement> = inject(ElementRef);

  /** Caller's private note for the current lesson. ``content`` is the
   *  live textarea value; ``savedAt`` is set after every successful
   *  PUT and feeds the inline "Saved at HH:MM" status. */
  protected readonly noteContent = signal('');
  protected readonly noteSavedAt = signal<Date | null>(null);
  /** Carries BOTH the lesson id (captured at keystroke time) and the
   *  content, so a debounced save that fires after a fast prev/next still
   *  writes to the lesson the user was typing on — not whatever lesson is
   *  loaded by the time the 600 ms debounce expires. */
  private readonly noteInput$ = new Subject<{lessonId: number; content: string}>();
  private noteSub: Subscription | null = null;

  protected readonly ui = this.uiSvc.localized(getLessonViewUiText);
  /** Shared "Back" label — same source as every other LMS page. */
  protected readonly editorUi = this.uiSvc.editor;
  protected readonly currentLang = this.userService.lang;

  protected readonly lesson = signal<LessonDetailDto | null>(null);
  protected readonly completing = signal(false);

  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api`;
  private routeSub: Subscription | null = null;

  /** One-line composite page-header title:
   *  ``SECTION TITLE - Leçon x/y : titre leçon`` when the lesson is
   *  surfaced with its section and its position in the course. Falls
   *  back to just the lesson title at the course boundaries (or when
   *  ``section_title`` / ``position_in_section`` were not yet shipped
   *  by the backend). */
  protected readonly title = computed(() => {
    const l = this.lesson();
    const lessonTitle = pickTranslation(l?.translations, this.currentLang(), 'title');
    if (!l?.section_title || !l?.position_in_section) {
      return lessonTitle;
    }
    const pos = this.ui().positionInSection(l.position_in_section.current, l.position_in_section.total);
    return `${l.section_title.toUpperCase()} - ${pos} : ${lessonTitle}`;
  });

  protected readonly blocks = computed<ContentBlock[]>(() => this.lesson()?.blocks ?? []);

  protected readonly isCompleted = computed(() => this.lesson()?.completed === true);

  protected readonly canManage = computed(() => this.lesson()?.can_manage === true);

  /** Anchor href that takes the user back to the parent course detail page.
   *  Falls back to the catalog when the lesson detail has not yet exposed a
   *  ``course_slug`` (mid-load or a backend regression). */
  protected readonly backHref = computed<string>(() => {
    const slug = this.lesson()?.course_slug;
    return slug ? COURSE_DETAIL(slug) : CATALOG;
  });

  /** Lesson-edit route for the right-side "Edit" affordance, gated by ``canManage``. */
  protected readonly editHref = computed<string | null>(() => {
    if (!this.canManage()) {
      return null;
    }
    const id = this.lesson()?.id;
    return id ? LESSON_EDIT(id) : null;
  });

  /** Neighbouring-lesson view-models for the footer prev/next buttons.
   *  ``null`` at the course boundary — the template hides the button. */
  protected readonly prevLesson = computed(() => this.lesson()?.prev_lesson ?? null);
  protected readonly nextLesson = computed(() => this.lesson()?.next_lesson ?? null);

  protected lessonHref(id: number): ReturnType<typeof LESSON_VIEW> {
    return LESSON_VIEW(id);
  }

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const idRaw = params.get('id');
      const id = idRaw !== null ? Number(idRaw) : NaN;
      if (!Number.isFinite(id) || id <= 0) {
        this.lesson.set(null);
        return;
      }
      this.loadLesson(id);
      this.loadNote(id);
    });
    // Debounced auto-save: every keystroke streams through this
    // subject and only the final value (after 600ms of inactivity)
    // hits the backend. Matches the block-editor's 500ms — slightly
    // longer here because notes tend to be longer-form than
    // form fields.
    this.noteSub = this.noteInput$
      .pipe(debounceTime(600))
      .subscribe(({lessonId, content}) => this.persistNote(lessonId, content));
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.routeSub = null;
    this.noteSub?.unsubscribe();
    this.noteSub = null;
  }

  protected onNoteChange(value: string): void {
    this.noteContent.set(value);
    const lessonId = this.lesson()?.id;
    if (!lessonId) {
      return;
    }
    // Capture the lesson id NOW so a navigation before the debounce fires
    // cannot misattribute this content to the next lesson.
    this.noteInput$.next({lessonId, content: value});
  }

  /** Pretty "HH:MM" rendering of the last saved-at timestamp. Returns
   *  null when no save has happened yet so the template hides the
   *  hint instead of showing a dummy value. */
  protected noteSavedAtLabel(): string | null {
    const ts = this.noteSavedAt();
    if (!ts) {
      return null;
    }
    return ts.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
  }

  private loadNote(lessonId: number): void {
    this.enrollment.getLessonNote(lessonId).subscribe({
      next: (note) => {
        this.noteContent.set(note?.content ?? '');
        this.noteSavedAt.set(null);
      },
      error: (err: unknown) => {
        logApiError('lms.lesson-view.note.load', err);
        this.noteContent.set('');
      },
    });
  }

  private persistNote(lessonId: number, content: string): void {
    if (!lessonId) {
      return;
    }
    this.enrollment.saveLessonNote(lessonId, content).subscribe({
      next: () => {
        // Only surface "Saved at…" when the save targeted the lesson the
        // user is still looking at; a late save for a previous lesson must
        // not flash a misleading timestamp on the current one.
        if (this.lesson()?.id === lessonId) {
          this.noteSavedAt.set(new Date());
        }
      },
      error: (err: unknown) => {
        logApiError('lms.lesson-view.note.save', err);
      },
    });
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
        // Nudge the learner toward the next step: smooth-scroll the
        // footer into view so the "Next lesson" CTA is visible without
        // a hunt. Skipped at the course boundary (no next lesson).
        if (this.nextLesson()) {
          queueMicrotask(() => {
            const footer = this.hostElement.nativeElement.querySelector<HTMLElement>('.lesson-footer');
            footer?.scrollIntoView({behavior: 'smooth', block: 'center'});
          });
        }
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
