import {CommonModule} from '@angular/common';
import {Component, ChangeDetectionStrategy, input, output} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {ButtonModule} from 'primeng/button';
import {MultiSelectModule} from 'primeng/multiselect';

import {QuestionReadDto} from '../../api/generated/model/question-read';
import {QuestionLibraryCard} from '../../pages/quiz/create/quiz-template-builder.models';
import {QuizCreateUiText} from '../../pages/quiz/create/quiz-create.i18n';

@Component({
  selector: 'app-quiz-question-library',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    MultiSelectModule,
  ],
  templateUrl: './quiz-question-library.html',
  styleUrl: './quiz-question-library.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizQuestionLibraryComponent {
  readonly texts = input.required<QuizCreateUiText>();
  readonly selectedDomainId = input(0);
  readonly loading = input(false);
  readonly search = input('');
  readonly items = input<QuestionLibraryCard[]>([]);
  readonly subjectOptions = input<Array<{name: string; code: number}>>([]);
  readonly selectedSubjectIds = input<number[]>([]);

  readonly searchChanged = output<Event>();
  readonly selectedSubjectIdsChange = output<number[]>();
  readonly createQuestion = output<void>();
  readonly previewQuestion = output<QuestionReadDto>();
  readonly addQuestion = output<QuestionReadDto>();
}
