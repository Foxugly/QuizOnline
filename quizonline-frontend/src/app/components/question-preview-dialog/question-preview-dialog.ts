import {CommonModule} from '@angular/common';
import {Component, DestroyRef, computed, effect, inject, input, output, signal, ChangeDetectionStrategy} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {finalize} from 'rxjs/operators';

import {DialogModule} from 'primeng/dialog';

import {QuestionReadDto} from '../../api/generated/model/question-read';
import {QuizQuestionComponent} from '../quiz-question/quiz-question';
import {QuizNavItem} from '../quiz-nav/quiz-nav';
import {QuestionService} from '../../services/question/question';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {getQuestionPreviewDialogUiText} from './question-preview-dialog.i18n';

@Component({
  selector: 'app-question-preview-dialog',
  imports: [
    CommonModule,
    DialogModule,
    QuizQuestionComponent,
  ],
  templateUrl: './question-preview-dialog.html',
  styleUrl: './question-preview-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionPreviewDialogComponent {
  readonly questionId = input<number | null>(null);
  readonly visible = input(false);
  readonly visibleChange = output<boolean>();

  readonly pageText = inject(UiTextService).localized(getQuestionPreviewDialogUiText);

  // Signals (OnPush): the template only re-renders when these change.
  // Plain class fields here would render once on dialog open and then
  // never update when the question fetch resolves — the user would see
  // an empty preview until the next CD tick (e.g. a click).
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly question = signal<QuestionReadDto | null>(null);

  readonly previewItem = computed<QuizNavItem | null>(() => {
    const q = this.question();
    if (!q) {
      return null;
    }
    return {
      index: 1,
      id: q.id,
      answered: false,
      flagged: false,
      question: q,
      selectedOptionIds: [],
    };
  });

  private readonly questionService = inject(QuestionService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      const visible = this.visible();
      const questionId = this.questionId();

      if (!visible) {
        this.resetState();
        return;
      }

      this.loadQuestion(questionId);
    });
  }

  onVisibleChange(visible: boolean): void {
    if (!visible) {
      this.resetState();
    }
    this.visibleChange.emit(visible);
  }

  private loadQuestion(questionId: number | null): void {
    if (!questionId) {
      this.error.set(this.pageText().notFound);
      this.question.set(null);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.question.set(null);

    this.questionService.retrieve(questionId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (question) => {
          this.question.set(question);
        },
        error: (error) => {
          console.error(error);
          this.error.set(this.pageText().loadFailed);
        },
      });
  }

  private resetState(): void {
    this.loading.set(false);
    this.error.set(null);
    this.question.set(null);
  }
}
