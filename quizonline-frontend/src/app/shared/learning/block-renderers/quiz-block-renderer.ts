import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Router} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {SkeletonModule} from 'primeng/skeleton';
import {TagModule} from 'primeng/tag';
import {forkJoin} from 'rxjs';

import {ModeEnumDto} from '../../../api/generated/model/mode-enum';
import {QuizListDto} from '../../../api/generated/model/quiz-list';
import {QuizTemplateDto} from '../../../api/generated/model/quiz-template';
import {QuizService} from '../../../services/quiz/quiz';
import {QuizTemplateService} from '../../../services/quiz-template/quiz-template';
import {UserService} from '../../../services/user/user';
import {logApiError} from '../../../shared/api/api-errors';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../shared/learning/content-block.types';
import {pickTranslation, type TranslationsMap} from '../../../shared/learning/learning-translations';
import {getBlockRenderersUiText} from './block-renderers.i18n';

/**
 * Launcher card for the ``quiz`` ContentBlock.
 *
 * The full quiz player is multi-page and route-driven (``/quiz/:id/questions``),
 * so we can't host it inline in a lesson. Instead, this card surfaces:
 *
 * - the quiz title (parler-translated, falls back to ``Quiz #{id}``),
 * - a meta line with the question pool size, optional duration and mode,
 * - the right CTA for the learner's most recent session against this
 *   template:
 *
 *   * no prior session, or all sessions closed → **Start quiz** (POST
 *     ``/api/quiz/``, then navigate to the player),
 *   * active session → **Resume quiz** (link to the player),
 *   * closed session → score tag + **View result** + a **Retake** CTA
 *     when the template still accepts answers,
 *   * template no longer answerable → "no attempts remaining" hint.
 *
 * Loading shows a small skeleton; fetch errors flip to a localized error
 * row with a Retry button so the rest of the lesson keeps rendering.
 * This is in-line formative quizzing — it is NOT wired to the
 * ``LessonQuiz`` validation-gate (those are a separate block type and
 * use the ``/api/lesson-quiz/`` endpoints).
 */
type ActionState =
  | {kind: 'start'}
  | {kind: 'resume'; session: QuizListDto}
  | {kind: 'closed'; session: QuizListDto; canRetake: boolean}
  | {kind: 'blocked'; session: QuizListDto | null};

@Component({
  selector: 'app-block-quiz',
  imports: [ButtonModule, SkeletonModule, TagModule],
  template: `
    @if (block().quiz_template; as templateId) {
      <aside class="quiz-block" role="region">
        @switch (loadState()) {
          @case ('loading') {
            <div class="quiz-block__loading">
              <p-skeleton width="60%" height="1.25rem" />
              <p-skeleton width="40%" height="1rem" styleClass="mt-2" />
              <p-skeleton width="8rem" height="2.25rem" styleClass="mt-3" />
            </div>
          }
          @case ('error') {
            <p class="quiz-block__error">{{ ui().quizBlockLoadFailed }}</p>
            <p-button
              [label]="ui().quizBlockRetry"
              icon="pi pi-refresh"
              severity="secondary"
              [outlined]="true"
              (onClick)="load(templateId)" />
          }
          @case ('ready') {
            <header class="quiz-block__header">
              <h3 class="quiz-block__title">{{ title(templateId) }}</h3>
              <p class="quiz-block__meta">
                <span>{{ ui().quizBlockQuestionsLabel(maxQuestions()) }}</span>
                @if (durationMinutes(); as d) {
                  <span aria-hidden="true">·</span>
                  <span>{{ ui().quizBlockDurationLabel(d) }}</span>
                }
                <span aria-hidden="true">·</span>
                <span>{{ modeLabel() }}</span>
              </p>
            </header>

            @if (closedScorePercent(); as percent) {
              <p-tag
                severity="info"
                [value]="ui().quizBlockScoreLabel(percent)"
                styleClass="quiz-block__score" />
            }

            @switch (actionState().kind) {
              @case ('start') {
                <p-button
                  [label]="ui().quizBlockStartButton"
                  icon="pi pi-play"
                  [loading]="starting()"
                  [disabled]="starting()"
                  (onClick)="startNewSession(templateId)" />
              }
              @case ('resume') {
                <p-button
                  [label]="ui().quizBlockResumeButton"
                  icon="pi pi-play"
                  (onClick)="goToSession()" />
              }
              @case ('closed') {
                <div class="quiz-block__actions">
                  <p-button
                    [label]="ui().quizBlockViewResultButton"
                    icon="pi pi-eye"
                    severity="secondary"
                    [outlined]="true"
                    (onClick)="goToView()" />
                  @if (closedActionCanRetake()) {
                    <p-button
                      [label]="ui().quizBlockRetakeButton"
                      icon="pi pi-refresh"
                      [loading]="starting()"
                      [disabled]="starting()"
                      (onClick)="startNewSession(templateId)" />
                  }
                </div>
              }
              @case ('blocked') {
                <p class="quiz-block__notice">{{ ui().quizBlockNoAttemptsRemaining }}</p>
              }
            }
          }
        }
      </aside>
    } @else {
      <aside class="quiz-block quiz-block--unconfigured">
        <p class="quiz-block__notice">{{ ui().quizBlockNotConfigured }}</p>
      </aside>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizBlockRenderer implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly quizService = inject(QuizService);
  private readonly templateService = inject(QuizTemplateService);
  private readonly userService = inject(UserService);

  protected readonly ui = inject(UiTextService).localized(getBlockRenderersUiText);

  readonly block = input.required<ContentBlock>();

  protected readonly templateInfo = signal<QuizTemplateDto | null>(null);
  protected readonly latestSession = signal<QuizListDto | null>(null);
  protected readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly starting = signal(false);

  protected readonly maxQuestions = computed(() => {
    const t = this.templateInfo();
    if (!t) return 0;
    // ``max_questions`` is the pool size cap; fall back to questions_count
    // when the template uses the whole pool.
    return t.max_questions ?? t.questions_count ?? 0;
  });

  protected readonly durationMinutes = computed<number | null>(() => {
    const t = this.templateInfo();
    if (!t || !t.with_duration) return null;
    return typeof t.duration === 'number' && t.duration > 0 ? t.duration : null;
  });

  protected readonly modeLabel = computed(() => {
    const mode = this.templateInfo()?.mode;
    return mode === ModeEnumDto.Exam ? this.ui().quizBlockModeExam : this.ui().quizBlockModePractice;
  });

  /**
   * Latest session is "active" when ``active === true`` AND the user has
   * not yet ended it (``ended_at`` empty). The backend keeps ``active``
   * true between session creation and the close call, so this matches
   * "can keep answering".
   */
  protected readonly actionState = computed<ActionState>(() => {
    const session = this.latestSession();
    const tpl = this.templateInfo();
    const canAnswer = tpl?.can_answer === true;

    if (!session) {
      return canAnswer ? {kind: 'start'} : {kind: 'blocked', session: null};
    }

    const isActive = session.active === true && !session.ended_at;
    if (isActive) {
      return {kind: 'resume', session};
    }

    return {kind: 'closed', session, canRetake: canAnswer};
  });

  protected readonly closedScorePercent = computed<number | null>(() => {
    const state = this.actionState();
    if (state.kind !== 'closed') return null;
    const {earned_score: earned, max_score: max} = state.session;
    if (earned == null || max == null || max <= 0) return null;
    return Math.round((earned / max) * 100);
  });

  protected readonly closedActionCanRetake = computed(() => {
    const state = this.actionState();
    return state.kind === 'closed' && state.canRetake;
  });

  ngOnInit(): void {
    const templateId = this.block().quiz_template;
    if (templateId !== null && templateId !== undefined) {
      this.load(templateId);
    }
  }

  protected title(templateId: number): string {
    const tpl = this.templateInfo();
    if (!tpl) {
      return this.ui().quizBlockFallbackTitle(templateId);
    }
    // ``QuizTemplateDto.translations`` is typed against the generated
    // ``LocalizedQuizTemplateTranslationDto``; the LMS ``pickTranslation``
    // helper is shape-compatible (it only reads the ``title`` field) but
    // its TS contract is stricter, hence the narrowing cast.
    const translations = tpl.translations as unknown as TranslationsMap;
    const translated = pickTranslation(translations, this.userService.lang(), 'title');
    return translated || tpl.title || this.ui().quizBlockFallbackTitle(templateId);
  }

  protected goToSession(): void {
    const session = this.latestSession();
    if (!session) return;
    void this.router.navigate(['/quiz', session.id, 'questions']);
  }

  protected goToView(): void {
    const session = this.latestSession();
    if (!session) return;
    void this.router.navigate(['/quiz', session.id]);
  }

  protected startNewSession(templateId: number): void {
    if (this.starting()) return;
    this.starting.set(true);
    this.quizService
      .createQuizFromTemplate(templateId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (quiz) => {
          this.starting.set(false);
          // Exam mode may return an already-existing, not-yet-started
          // session — that's still the right target to navigate to.
          void this.router.navigate(['/quiz', quiz.id, 'questions']);
        },
        error: (err: unknown) => {
          logApiError('lms.lesson-view.quiz-block.start', err);
          this.starting.set(false);
          this.loadState.set('error');
        },
      });
  }

  protected load(templateId: number): void {
    this.loadState.set('loading');
    forkJoin({
      template: this.templateService.retrieve(templateId),
      sessions: this.quizService.listQuiz(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({template, sessions}) => {
          this.templateInfo.set(template);
          this.latestSession.set(this.pickLatest(sessions, templateId));
          this.loadState.set('ready');
        },
        error: (err: unknown) => {
          logApiError('lms.lesson-view.quiz-block.load', err);
          this.loadState.set('error');
        },
      });
  }

  /**
   * Picks the most recent session this user has against ``templateId``.
   * ``/api/quiz/`` returns sessions visible to the caller — we filter
   * client-side to ``user === me`` to be defensive against backend
   * permission widening.
   */
  private pickLatest(sessions: QuizListDto[], templateId: number): QuizListDto | null {
    const me = this.userService.currentUser()?.id;
    const mine = sessions.filter((s) =>
      s.quiz_template === templateId && (me == null || s.user === me),
    );
    if (!mine.length) return null;
    // Sort by ``created_at`` desc (string ISO compares correctly), then
    // by id desc to break ties when two sessions share the same timestamp.
    return mine.sort((a, b) => {
      const cmp = (b.created_at ?? '').localeCompare(a.created_at ?? '');
      return cmp !== 0 ? cmp : b.id - a.id;
    })[0];
  }
}
