import {Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute} from '@angular/router';
import {finalize, forkJoin} from 'rxjs';
import {FormsModule} from '@angular/forms';
import {DialogModule} from 'primeng/dialog';
import {TextareaModule} from 'primeng/textarea';
import {ButtonModule} from 'primeng/button';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {ConfirmationService} from 'primeng/api';
import {AnswerPayload, QuizQuestionComponent} from '../../../components/quiz-question/quiz-question';
import {QuizNav, QuizNavItem} from '../../../components/quiz-nav/quiz-nav';
import {QuizDto} from '../../../api/generated/model/quiz';
import {QuizQuestionAnswerWriteRequestDto} from '../../../api/generated/model/quiz-question-answer-write-request';
import {QuizService} from '../../../services/quiz/quiz';
import {
  applyQuizAnswers,
  buildQuizNavItems,
  findQuizNavItem,
  updateQuizNavItem,
} from '../../../shared/quiz/quiz-session-state';
import {logApiError, userFacingApiMessage} from '../../../shared/api/api-errors';
import {QuizCountdownComponent} from '../../../shared/components/quiz-countdown/quiz-countdown';
import {QuizAlertService} from '../../../services/quiz-alert/quiz-alert';
import {UserService} from '../../../services/user/user';

@Component({
  selector: 'app-quiz-question-view',
  imports: [
    FormsModule,
    DialogModule,
    TextareaModule,
    ButtonModule,
    ConfirmDialogModule,
    QuizQuestionComponent,
    QuizNav,
    QuizCountdownComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './question-view.html',
  styleUrl: './question-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizQuestionView implements OnInit {
  private readonly userService = inject(UserService);
  readonly editorUi = inject(UiTextService).editor;
  quiz_id!: number;
  index = 1;
  loading = signal(false);
  error = signal<string | null>(null);
  quizSession = signal<QuizDto | null>(null);
  quizNavItem = signal<QuizNavItem | null>(null);
  quizNavItems = signal<QuizNavItem[]>([]);
  autoClosing = signal(false);
  reportDialogVisible = signal(false);
  reportMessage = signal('');
  reportSaving = signal(false);
  protected showCorrect = false;
  protected reviewMode = false;

  private readonly route = inject(ActivatedRoute);
  private readonly quizService = inject(QuizService);
  private readonly quizAlertService = inject(QuizAlertService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmationService = inject(ConfirmationService);

  ngOnInit(): void {
    this.quiz_id = Number(this.route.snapshot.paramMap.get('quiz_id'));
    if (!this.quiz_id || Number.isNaN(this.quiz_id)) {
      this.error.set(this.editorUi().quiz.invalidQuizId);
      return;
    }

    this.loadQuizSession();
  }

  onNextQuestion(payload: AnswerPayload): void {
    if (this.reviewMode) {
      this.goQuestionNext(payload.index);
      return;
    }
    this.persistAnswer(payload, () => {
      this.goQuestionNext(payload.index);
    });
  }

  onPreviousQuestion(payload: AnswerPayload): void {
    if (this.reviewMode) {
      this.goQuestionPrev(payload.index);
      return;
    }
    this.persistAnswer(payload, () => {
      this.goQuestionPrev(payload.index);
    });
  }

  onFinishQuiz(payload: AnswerPayload): void {
    if (this.reviewMode) {
      this.quizService.goView(this.quiz_id);
      return;
    }
    const ui = this.editorUi().quiz;
    this.confirmationService.confirm({
      header: ui.finishQuizConfirmHeader,
      message: ui.finishQuizConfirmMessage,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: ui.finishQuizButton,
      rejectLabel: this.editorUi().common.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.persistAnswer(payload, () => {
          this.closeQuizAndRedirect();
        });
      },
    });
  }

  onQuestionSelected(index: number): void {
    this.changeQuestion(index);
  }

  onSelectionChanged(payload: AnswerPayload): void {
    if (this.reviewMode) {
      return;
    }
    this.setCurrentItem({
      answered: payload.selectedOptionIds.length > 0,
      selectedOptionIds: payload.selectedOptionIds,
    });
  }

  goBackToQuiz(): void {
    this.quizService.goView(this.quiz_id);
  }

  openReportDialog(): void {
    this.reportMessage.set('');
    this.reportDialogVisible.set(true);
  }

  closeReportDialog(): void {
    this.reportDialogVisible.set(false);
  }

  submitAlert(): void {
    const current = this.quizNavItem();
    const body = this.reportMessage().trim();
    if (!current || !body) {
      return;
    }

    this.reportSaving.set(true);
    this.quizAlertService.create({
      quiz_id: this.quiz_id,
      question_id: current.question.id,
      body,
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.reportSaving.set(false)),
      )
      .subscribe({
        next: () => {
          this.reportDialogVisible.set(false);
          this.reportMessage.set('');
          this.quizAlertService.refreshUnreadCount().subscribe({error: () => {}});
        },
        error: (err: unknown) => {
          logApiError('quiz.question.alert', err);
          this.error.set(userFacingApiMessage(err, this.editorUi().quiz.alertSendFailed));
        },
      });
  }

  toggleFlag(): void {
    this.setCurrentItem({
      flagged: !this.quizNavItem()?.flagged,
    });
  }

  protected hasQuestionNext(index: number): boolean {
    return index < this.quizNavItems().length;
  }

  protected hasQuestionPrev(index: number): boolean {
    return index > 1;
  }

  private goQuestionNext(index: number): void {
    if (this.hasQuestionNext(index)) {
      this.changeQuestion(index + 1);
    }
  }

  private goQuestionPrev(index: number): void {
    if (this.hasQuestionPrev(index)) {
      this.changeQuestion(index - 1);
    }
  }

  private persistAnswer(payload: AnswerPayload, afterSave?: () => void): void {
    if (this.isAnswerLocked()) {
      this.error.set(this.editorUi().quiz.timeUp);
      this.closeQuizAndRedirect(true);
      return;
    }

    const answerPayload: QuizQuestionAnswerWriteRequestDto = {
      question_id: payload.questionId,
      selected_options: payload.selectedOptionIds,
    };

    this.quizService
      .saveAnswer(this.quiz_id, answerPayload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setCurrentItem({
            answered: true,
            selectedOptionIds: payload.selectedOptionIds,
          });
          afterSave?.();
        },
        error: (err: unknown): void => {
          logApiError('quiz.question.save-answer', err);
          this.handleSaveError(err);
        },
      });
  }

  /**
   * Reconcile a save failure with the server's view of the quiz. The frontend
   * timer / state may disagree with the backend (clock skew, or the parent
   * QuizTemplate.ended_at passed while Quiz.ended_at is still in the future).
   * Server is the source of truth: re-fetch, and if can_answer is false we
   * stop the session and bounce the user back to /quiz/{id} like the timer
   * expiry path does.
   */
  private handleSaveError(err: unknown): void {
    const ui = this.editorUi().quiz;
    this.quizService
      .retrieveQuiz(this.quiz_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          if (!session.can_answer) {
            this.error.set(ui.quizUnavailable);
            this.closeQuizAndRedirect(true);
            return;
          }
          this.error.set(userFacingApiMessage(err, ui.saveAnswerFailed));
        },
        error: () => {
          // Re-fetch itself failed (network etc.). Fall back to whatever the
          // local timer thinks.
          if (this.isTimedOut()) {
            this.error.set(ui.timeUp);
            this.closeQuizAndRedirect(true);
            return;
          }
          this.error.set(userFacingApiMessage(err, ui.saveAnswerFailed));
        },
      });
  }

  private changeQuestion(index: number): void {
    const item = findQuizNavItem(this.quizNavItems(), index);
    if (!item) {
      return;
    }

    this.index = index;
    this.quizNavItem.set(item);
  }

  private setCurrentItem(changes: Partial<QuizNavItem>): void {
    const current = this.quizNavItem();
    if (!current) {
      return;
    }

    const updatedItems = updateQuizNavItem(this.quizNavItems(), current.index, changes);
    this.quizNavItems.set(updatedItems);
    this.quizNavItem.set(findQuizNavItem(updatedItems, current.index));
  }

  private loadQuizSession(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      session: this.quizService.retrieveQuiz(this.quiz_id),
      answers: this.quizService.listAnswers(this.quiz_id),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({session, answers}) => {
          const readonlySession = !!session.started_at && !session.can_answer;
          this.reviewMode = readonlySession;
          this.showCorrect = session.answer_correctness_state === 'full';

          const navItems = applyQuizAnswers(buildQuizNavItems(session.questions), answers);
          if (!navItems.length) {
            this.error.set(this.editorUi().quiz.noQuestions);
            return;
          }

          this.quizSession.set(session);
          this.quizNavItems.set(navItems);
          this.changeQuestion(1);
        },
        error: (err: unknown) => {
          logApiError('quiz.question.load-session', err);
          this.error.set(userFacingApiMessage(err, this.editorUi().quiz.loadFailed));
        },
      });
  }

  /**
   * Called by ``<app-quiz-countdown>`` when the deadline is crossed.
   * Public on purpose so the template can bind it directly. The
   * component owns the ticking logic and we just react here.
   */
  handleTimerExpired(): void {
    this.error.set(this.editorUi().quiz.timeUpAutoClose);
    this.closeQuizAndRedirect(true);
  }

  private closeQuizAndRedirect(triggeredByTimer = false): void {
    if (this.autoClosing()) {
      return;
    }

    this.autoClosing.set(true);

    this.quizService
      .closeQuiz(this.quiz_id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.autoClosing.set(false)),
      )
      .subscribe({
        next: (session) => {
          this.quizSession.set(session);
          this.quizService.goView(this.quiz_id);
        },
        error: (err: unknown): void => {
          logApiError('quiz.question.close-quiz', err);
          if (triggeredByTimer) {
            this.quizService.goView(this.quiz_id);
            return;
          }
          this.error.set(userFacingApiMessage(err, this.editorUi().quiz.closeFailed));
        },
      });
  }

  private isAnswerLocked(): boolean {
    return this.reviewMode || this.autoClosing() || this.isTimedOut();
  }

  private isTimedOut(): boolean {
    const session = this.quizSession();
    if (!session?.with_duration || !session.ended_at) {
      return false;
    }

    return new Date(session.ended_at).getTime() <= Date.now();
  }

}
