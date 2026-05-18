import {ChangeDetectionStrategy, Component, inject} from '@angular/core';

import {UiTextService} from '../../../shared/i18n/ui-text.service';

import {getLmsLessonEditUiText} from './lesson-edit.i18n';

@Component({
  selector: 'app-lms-lesson-edit',
  templateUrl: './lesson-edit.html',
  styleUrl: './lesson-edit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsLessonEdit {
  protected ui = inject(UiTextService).localized(getLmsLessonEditUiText);
}
