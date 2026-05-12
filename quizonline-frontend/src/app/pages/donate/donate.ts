import {ChangeDetectionStrategy, Component, inject} from '@angular/core';

import {UiTextService} from '../../shared/i18n/ui-text.service';
import {getDonateUiText} from './donate.i18n';

@Component({
  selector: 'app-donate',
  templateUrl: './donate.html',
  styleUrl: './donate.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Donate {
  protected readonly sponsorUrl = 'https://github.com/sponsors/Foxugly';
  protected readonly ui = inject(UiTextService).localized(getDonateUiText);
}
