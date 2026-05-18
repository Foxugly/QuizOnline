import {ChangeDetectionStrategy, Component, inject} from '@angular/core';

import {UiTextService} from '../../../shared/i18n/ui-text.service';

import {getLmsCatalogUiText} from './catalog.i18n';

@Component({
  selector: 'app-lms-catalog',
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCatalog {
  protected ui = inject(UiTextService).localized(getLmsCatalogUiText);
}
