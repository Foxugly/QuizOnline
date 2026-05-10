import {Component, computed, inject, ChangeDetectionStrategy} from '@angular/core';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {ButtonModule} from 'primeng/button';
import {QuizNav, QuizNavItem} from '../quiz-nav/quiz-nav';
import {UserService} from '../../services/user/user';

@Component({
  selector: 'app-quiz-play',
  imports: [QuizNav, ButtonModule],
  templateUrl: './quiz-play.html',
  styleUrl: './quiz-play.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizPlayComponent {
  private readonly userService = inject(UserService);
  readonly editorUi = inject(UiTextService).editor;
  questionNavItems: QuizNavItem[] = [];
  currentQuestionIndex = 1;

  onQuestionSelected(index: number): void {
    this.currentQuestionIndex = index;
  }

  markAnswered(index: number): void {
    const i = this.questionNavItems.findIndex((q) => q.index === index);
    if (i === -1) return;
    this.questionNavItems[i] = {...this.questionNavItems[i], answered: true};
    this.questionNavItems = [...this.questionNavItems];
  }

  toggleFlag(index: number): void {
    const i = this.questionNavItems.findIndex((q) => q.index === index);
    if (i === -1) return;
    this.questionNavItems[i] = {...this.questionNavItems[i], flagged: !this.questionNavItems[i].flagged};
    this.questionNavItems = [...this.questionNavItems];
  }
}
