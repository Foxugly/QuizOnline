import {ChangeDetectionStrategy, Component, inject, input} from '@angular/core';

import {UiTextService} from '../../../../../shared/i18n/ui-text.service';

import {getLmsCourseEditStructureTabUiText} from './structure-tab.i18n';

/**
 * Minimal stub for the "Structure" tab. The future implementation will
 * surface a draggable section / lesson tree backed by
 * :meth:`LmsCatalogService.reorderSections` / ``reorderLessons``; for
 * the MVP we just keep a localized placeholder so the shell compiles
 * cleanly and the tab order is final.
 */
@Component({
  selector: 'app-lms-course-edit-structure-tab',
  templateUrl: './structure-tab.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCourseEditStructureTab {
  protected readonly ui = inject(UiTextService).localized(getLmsCourseEditStructureTabUiText);

  courseId = input.required<number>();
}
