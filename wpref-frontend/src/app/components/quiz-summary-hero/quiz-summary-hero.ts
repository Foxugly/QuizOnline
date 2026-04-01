import {Component, input, output} from '@angular/core';
import {Button} from 'primeng/button';
import {TagModule} from 'primeng/tag';
import {QuizDto} from '../../api/generated';

export interface QuizSummaryFact {
  label: string;
  value: string;
}

@Component({
  selector: 'app-quiz-summary-hero',
  imports: [
    Button,
    TagModule,
  ],
  templateUrl: './quiz-summary-hero.html',
  styleUrl: './quiz-summary-hero.scss',
})
export class QuizSummaryHeroComponent {
  readonly session = input.required<QuizDto>();
  readonly statusLabel = input.required<string>();
  readonly statusSeverity = input<'secondary' | 'success' | 'warn' | 'danger' | 'contrast' | 'info'>('secondary');
  readonly scoreLabel = input.required<string>();
  readonly scoreMetaLabel = input.required<string>();
  readonly facts = input<QuizSummaryFact[]>([]);
  readonly canReview = input(false);

  readonly back = output();
  readonly start = output();
  readonly openQuestion = output();

  onBack(): void {
    this.back.emit();
  }

  onStart(): void {
    this.start.emit();
  }

  onOpenQuestion(): void {
    this.openQuestion.emit();
  }
}
