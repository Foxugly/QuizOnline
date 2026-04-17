import {Component, computed, inject, input, output, ChangeDetectionStrategy} from '@angular/core';
import {ButtonModule} from 'primeng/button';
import {TagModule} from 'primeng/tag';
import {QuizDto} from '../../api/generated/model/quiz';
import {getEditorUiText} from '../../shared/i18n/editor-ui-text';
import {UserService} from '../../services/user/user';

export interface QuizSummaryFact {
  label: string;
  value: string;
}

@Component({
  selector: 'app-quiz-summary-hero',
  imports: [
    ButtonModule,
    TagModule,
  ],
  templateUrl: './quiz-summary-hero.html',
  styleUrl: './quiz-summary-hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizSummaryHeroComponent {
  private readonly userService = inject(UserService);
  readonly editorUi = computed(() => getEditorUiText(this.userService.currentLang));
  readonly session = input.required<QuizDto>();
  readonly statusLabel = input.required<string>();
  readonly statusSeverity = input<'secondary' | 'success' | 'warn' | 'danger' | 'contrast' | 'info'>('secondary');
  readonly showScore = input(true);
  readonly scoreLabel = input.required<string>();
  readonly scoreMetaLabel = input.required<string>();
  readonly facts = input<QuizSummaryFact[]>([]);
  readonly canReview = input(false);

  readonly back = output();
  readonly start = output();
  readonly openQuestion = output();
  readonly downloadPdf = output();

  onBack(): void {
    this.back.emit();
  }

  onStart(): void {
    this.start.emit();
  }

  onOpenQuestion(): void {
    this.openQuestion.emit();
  }

  onDownloadPdf(): void {
    this.downloadPdf.emit();
  }
}
