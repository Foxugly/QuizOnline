import {ChangeDetectionStrategy, Component, inject} from '@angular/core';

import {UiTextService} from '../../../shared/i18n/ui-text.service';

import {getLmsCourseDetailUiText} from './course-detail.i18n';

@Component({
  selector: 'app-lms-course-detail',
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCourseDetail {
  protected ui = inject(UiTextService).localized(getLmsCourseDetailUiText);
}
