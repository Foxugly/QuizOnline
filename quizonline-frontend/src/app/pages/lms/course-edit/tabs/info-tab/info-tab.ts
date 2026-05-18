import {ChangeDetectionStrategy, Component, inject, input, output} from '@angular/core';

import {CourseDetailDto} from '../../../../../api/generated/model/course-detail';
import {UiTextService} from '../../../../../shared/i18n/ui-text.service';

import {getLmsCourseEditInfoTabUiText} from './info-tab.i18n';

/**
 * Minimal stub for the course "Information" tab. Shows a localized
 * heading + placeholder so the shell is fully wired and i18n-clean;
 * the editable form (title / slug / level / cover image / description)
 * will replace the placeholder in a follow-up iteration.
 */
@Component({
  selector: 'app-lms-course-edit-info-tab',
  templateUrl: './info-tab.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCourseEditInfoTab {
  protected readonly ui = inject(UiTextService).localized(getLmsCourseEditInfoTabUiText);

  courseId = input.required<number>();
  readonly course = input<CourseDetailDto | null>(null);
  readonly changed = output<void>();
}
