import {CommonModule} from '@angular/common';
import {Component, EventEmitter, Input, Output} from '@angular/core';

import {ButtonModule} from 'primeng/button';

import {QuestionReadDto} from '../../api/generated';
import {QuestionLibraryCard} from '../../pages/quiz/create/quiz-template-builder.models';

@Component({
  selector: 'app-quiz-question-library',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
  ],
  templateUrl: './quiz-question-library.html',
  styleUrl: './quiz-question-library.scss',
})
export class QuizQuestionLibraryComponent {
  @Input() selectedDomainId = 0;
  @Input() loading = false;
  @Input() search = '';
  @Input() items: QuestionLibraryCard[] = [];

  @Output() searchChanged = new EventEmitter<Event>();
  @Output() createQuestion = new EventEmitter<void>();
  @Output() previewQuestion = new EventEmitter<QuestionReadDto>();
  @Output() addQuestion = new EventEmitter<QuestionReadDto>();
}
