import {ChangeDetectionStrategy, Component, inject} from '@angular/core';

import {UiTextService} from '../../../shared/i18n/ui-text.service';

import {getLmsProgressUiText} from './progress.i18n';

@Component({
  selector: 'app-lms-progress',
  templateUrl: './progress.html',
  styleUrl: './progress.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsProgress {
  protected ui = inject(UiTextService).localized(getLmsProgressUiText);
}
