import {ChangeDetectionStrategy, Component, inject} from '@angular/core';

import {UiTextService} from '../../shared/i18n/ui-text.service';
import {getFeaturesUiText} from './features.i18n';

@Component({
  selector: 'app-features',
  imports: [],
  templateUrl: './features.html',
  styleUrl: './features.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Features {
  protected readonly ui = inject(UiTextService).localized(getFeaturesUiText);
}
