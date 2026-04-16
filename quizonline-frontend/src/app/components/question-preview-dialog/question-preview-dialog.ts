import {CommonModule} from '@angular/common';
import {Component, DestroyRef, effect, inject, input, output, ChangeDetectionStrategy} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {finalize} from 'rxjs/operators';

import {DialogModule} from 'primeng/dialog';

import {QuestionReadDto} from '../../api/generated/model/question-read';
import {QuizQuestionComponent} from '../quiz-question/quiz-question';
import {QuizNavItem} from '../quiz-nav/quiz-nav';
import {QuestionService} from '../../services/question/question';

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

  loading = false;
  error: string | null = null;
  question: QuestionReadDto | null = null;

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

  get previewItem(): QuizNavItem | null {
    if (!this.question) {
      return null;
    }

    return {
      index: 1,
      id: this.question.id,
      answered: false,
      flagged: false,
      question: this.question,
      selectedOptionIds: [],
    };
  }

  onVisibleChange(visible: boolean): void {
    if (!visible) {
      this.resetState();
    }
    this.visibleChange.emit(visible);
  }

  private loadQuestion(questionId: number | null): void {
    if (!questionId) {
      this.error = "Question introuvable.";
      this.question = null;
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;
    this.question = null;

    this.questionService.retrieve(questionId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (question) => {
          this.question = question;
        },
        error: (error) => {
          console.error(error);
          this.error = "Impossible de charger l'aperçu de la question.";
        },
      });
  }

  private resetState(): void {
    this.loading = false;
    this.error = null;
    this.question = null;
  }
}
