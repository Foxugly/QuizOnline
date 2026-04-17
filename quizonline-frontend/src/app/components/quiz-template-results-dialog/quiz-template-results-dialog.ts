import {CommonModule} from '@angular/common';
import {Component, computed, inject, input, output, ChangeDetectionStrategy} from '@angular/core';
import {ButtonModule} from 'primeng/button';
import {DialogModule} from 'primeng/dialog';
import {TableModule} from 'primeng/table';
import {QuizTemplateDto} from '../../api/generated/model/quiz-template';
import {QuizTemplateAssignmentSessionDto} from '../../services/quiz/quiz';
import {getEditorUiText} from '../../shared/i18n/editor-ui-text';
import {UserService} from '../../services/user/user';

@Component({
  selector: 'app-quiz-template-results-dialog',
  imports: [CommonModule, ButtonModule, DialogModule, TableModule],
  templateUrl: './quiz-template-results-dialog.html',
  styleUrl: './quiz-template-results-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizTemplateResultsDialogComponent {
  private readonly userService = inject(UserService);
  readonly editorUi = computed(() => getEditorUiText(this.userService.currentLang));
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
