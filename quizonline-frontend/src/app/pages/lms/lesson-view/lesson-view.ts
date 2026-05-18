import {ChangeDetectionStrategy, Component, inject} from '@angular/core';

import {UiTextService} from '../../../shared/i18n/ui-text.service';

import {getLmsLessonViewUiText} from './lesson-view.i18n';

@Component({
  selector: 'app-lms-lesson-view',
  templateUrl: './lesson-view.html',
  styleUrl: './lesson-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsLessonView {
  protected ui = inject(UiTextService).localized(getLmsLessonViewUiText);
}
