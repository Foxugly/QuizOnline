import {ChangeDetectionStrategy, Component, inject} from '@angular/core';

import {UiTextService} from '../../../shared/i18n/ui-text.service';

import {getLmsCourseEditUiText} from './course-edit.i18n';

@Component({
  selector: 'app-lms-course-edit',
  templateUrl: './course-edit.html',
  styleUrl: './course-edit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCourseEdit {
  protected ui = inject(UiTextService).localized(getLmsCourseEditUiText);
}
