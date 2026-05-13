import {CommonModule} from '@angular/common';
import {Component, inject, input, output, ChangeDetectionStrategy} from '@angular/core';
import {ButtonModule} from 'primeng/button';
import {TableModule} from 'primeng/table';
import {UserQuizListItem} from '../../pages/quiz/list/quiz-list.models';
import {UserService} from '../../services/user/user';
import {formatLocalizedDateTime} from '../../shared/i18n/date-time';
import {UiTextService} from '../../shared/i18n/ui-text.service';

@Component({
  selector: 'app-quiz-session-table',
  imports: [CommonModule, ButtonModule, TableModule],
  templateUrl: './quiz-session-table.html',
  styleUrl: './quiz-session-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizSessionTableComponent {
  readonly quizzes = input<UserQuizListItem[]>([]);
  readonly loading = input(false);

  readonly viewQuiz = output<number>();
  private readonly userService = inject(UserService);
  readonly ui = inject(UiTextService).editor;

  statusLabel(status: UserQuizListItem['status']): string {
    const labels = this.ui().quizSessionTable;
    if (status === 'answered') {
      return labels.statusAnswered;
    }
    if (status === 'in_progress') {
      return labels.statusInProgress;
    }
    return labels.statusNotStarted;
  }

  actionLabel(status: UserQuizListItem['status']): string {
    const labels = this.ui().quizSessionTable;
    if (status === 'answered') {
      return labels.actionView;
    }
    if (status === 'in_progress') {
      return labels.actionContinue;
    }
    return labels.actionStart;
  }

  formatDateTime(value: string | null | undefined): string {
    return formatLocalizedDateTime(value, this.userService.currentLang) ?? '-';
  }
}
