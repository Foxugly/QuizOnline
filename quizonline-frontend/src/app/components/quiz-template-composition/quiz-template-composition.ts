import {CommonModule} from '@angular/common';
import {Component, ChangeDetectionStrategy, input, output} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {ButtonModule} from '@openng/optimus-ui/button';
import {InputNumberModule} from '@openng/optimus-ui/inputnumber';
import {TooltipModule} from '@openng/optimus-ui/tooltip';

import {SelectedQuestionCard} from '../../pages/quiz/create/quiz-template-builder.models';
import {QuizCreateUiText} from '../../pages/quiz/create/quiz-create.i18n';

@Component({
  selector: 'app-quiz-template-composition',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputNumberModule,
    TooltipModule,
  ],
  templateUrl: './quiz-template-composition.html',
  styleUrl: './quiz-template-composition.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizTemplateCompositionComponent {
  readonly items = input<SelectedQuestionCard[]>([]);
  readonly texts = input.required<QuizCreateUiText>();

  readonly previewQuestion = output<number>();
  readonly moveQuestion = output<{index: number; direction: -1 | 1}>();
  readonly removeQuestion = output<number>();
  readonly weightChanged = output<{index: number; event: Event}>();
  readonly weightSet = output<{index: number; value: number}>();
}
