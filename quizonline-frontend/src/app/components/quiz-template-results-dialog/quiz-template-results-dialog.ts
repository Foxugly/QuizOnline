import {CommonModule} from '@angular/common';
import {Component, input, output} from '@angular/core';
import {ButtonModule} from 'primeng/button';
import {DialogModule} from 'primeng/dialog';
import {TableModule} from 'primeng/table';
import {QuizTemplateDto} from '../../api/generated';
import {QuizTemplateAssignmentSessionDto} from '../../services/quiz/quiz';

@Component({
  selector: 'app-quiz-template-results-dialog',
  imports: [CommonModule, ButtonModule, DialogModule, TableModule],
  templateUrl: './quiz-template-results-dialog.html',
  styleUrl: './quiz-template-results-dialog.scss',
})
export class QuizTemplateResultsDialogComponent {
  visible = input(false);
  template = input<QuizTemplateDto | null>(null);
  sessions = input<QuizTemplateAssignmentSessionDto[]>([]);
  loading = input(false);

  visibleChange = output<boolean>();
  close = output<void>();
  viewQuiz = output<number>();

  onVisibleChange(value: boolean): void {
    this.visibleChange.emit(value);
  }

  onClose(): void {
    this.close.emit();
  }

  statusLabel(quiz: QuizTemplateAssignmentSessionDto): string {
    if (quiz.ended_at) {
      return 'Repondu';
    }
    if (quiz.started_at) {
      return 'En cours';
    }
    return 'Non commence';
  }

  openQuiz(quizId: number): void {
    this.viewQuiz.emit(quizId);
  }
}
