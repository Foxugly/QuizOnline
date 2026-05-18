import {ChangeDetectionStrategy, Component, inject, input} from '@angular/core';

import {UiTextService} from '../../../../../shared/i18n/ui-text.service';

import {getLmsCourseEditAnalyticsTabUiText} from './analytics-tab.i18n';

/**
 * Minimal stub for the "Analytics" tab. Future implementation will
 * pull course-level metrics (active vs completed enrollments, median
 * completion time, certificate yield) from the LMS analytics endpoint;
 * shell stays i18n-complete with a localized placeholder.
 */
@Component({
  selector: 'app-lms-course-edit-analytics-tab',
  templateUrl: './analytics-tab.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCourseEditAnalyticsTab {
  protected readonly ui = inject(UiTextService).localized(getLmsCourseEditAnalyticsTabUiText);

  courseId = input.required<number>();
}
