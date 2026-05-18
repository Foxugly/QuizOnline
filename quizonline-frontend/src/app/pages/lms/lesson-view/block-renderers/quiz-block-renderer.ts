import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';

import {UiTextService} from '../../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../../shared/lms/content-block.types';
import {getLmsLessonViewUiText} from '../lesson-view.i18n';

/**
 * Placeholder for the ``quiz`` ContentBlock.
 *
 * Wiring this renderer to the existing :class:`AppQuizPlay` component
 * (and to the ``LessonQuiz`` evaluation endpoint) is tracked under Phase
 * 14 of the LMS plan — the runner needs a lesson-aware host that knows
 * how to submit attempts via ``POST /api/lms/quiz-attempt/``. For T59 we
 * surface the quiz placeholder text through i18n so no English-only
 * string leaks into the UI.
 */
@Component({
  selector: 'app-block-quiz',
  template: `
    @if (block().quiz_template; as templateId) {
      <div class="quiz-block-placeholder">{{ placeholderText() }}</div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizBlockRenderer {
  protected readonly ui = inject(UiTextService).localized(getLmsLessonViewUiText);

  readonly block = input.required<ContentBlock>();

  protected readonly placeholderText = computed(() => {
    const id = this.block().quiz_template;
    return id !== null && id !== undefined ? this.ui().quizBlockPlaceholder(id) : '';
  });
}
