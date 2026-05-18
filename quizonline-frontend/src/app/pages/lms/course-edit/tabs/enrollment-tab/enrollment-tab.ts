import {ChangeDetectionStrategy, Component, inject, input} from '@angular/core';

import {UiTextService} from '../../../../../shared/i18n/ui-text.service';

import {getLmsCourseEditEnrollmentTabUiText} from './enrollment-tab.i18n';

/**
 * Minimal stub for the "Enrollment" tab. Will eventually surface
 * pending join-requests + approve / reject bulk actions backed by
 * :class:`LmsEnrollmentService`. For now keeps the shell complete and
 * fully translated.
 */
@Component({
  selector: 'app-lms-course-edit-enrollment-tab',
  templateUrl: './enrollment-tab.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCourseEditEnrollmentTab {
  protected readonly ui = inject(UiTextService).localized(getLmsCourseEditEnrollmentTabUiText);

  courseId = input.required<number>();
}
