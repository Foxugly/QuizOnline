import {CommonModule} from '@angular/common';
import {Component, EventEmitter, Input, Output} from '@angular/core';

import {ButtonModule} from 'primeng/button';

import {SelectedQuestionCard} from '../../pages/quiz/create/quiz-template-builder.models';

@Component({
  selector: 'app-quiz-template-composition',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
  ],
  templateUrl: './quiz-template-composition.html',
  styleUrl: './quiz-template-composition.scss',
})
export class QuizTemplateCompositionComponent {
  @Input() items: SelectedQuestionCard[] = [];

  @Output() previewQuestion = new EventEmitter<number>();
  @Output() moveQuestion = new EventEmitter<{index: number; direction: -1 | 1}>();
  @Output() removeQuestion = new EventEmitter<number>();
  @Output() weightChanged = new EventEmitter<{index: number; event: Event}>();
}
