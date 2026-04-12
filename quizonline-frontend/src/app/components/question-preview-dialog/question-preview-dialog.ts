import {CommonModule} from '@angular/common';
import {Component, DestroyRef, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {finalize} from 'rxjs/operators';

import {DialogModule} from 'primeng/dialog';

import {QuestionRead} from '../../api/generated';
import {QuizQuestionComponent} from '../quiz-question/quiz-question';
import {QuizNavItem} from '../quiz-nav/quiz-nav';
import {QuestionService} from '../../services/question/question';

@Component({
  selector: 'app-question-preview-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    QuizQuestionComponent,
  ],
  templateUrl: './question-preview-dialog.html',
  styleUrl: './question-preview-dialog.scss',
})
export class QuestionPreviewDialogComponent implements OnChanges {
  @Input() questionId: number | null = null;
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  loading = false;
  error: string | null = null;
  question: QuestionRead | null = null;

  private readonly questionService = inject(QuestionService);
  private readonly destroyRef = inject(DestroyRef);

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

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.visible) {
      this.resetState();
      return;
    }

    if (changes['questionId'] || changes['visible']) {
      this.loadQuestion();
    }
  }

  onVisibleChange(visible: boolean): void {
    if (!visible) {
      this.resetState();
    }
    this.visibleChange.emit(visible);
  }

  private loadQuestion(): void {
    if (!this.questionId) {
      this.error = "Question introuvable.";
      this.question = null;
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;
    this.question = null;

    this.questionService.retrieve(this.questionId)
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
