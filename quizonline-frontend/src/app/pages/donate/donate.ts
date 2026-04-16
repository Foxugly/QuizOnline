import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';

import {UserService} from '../../services/user/user';
import {getDonateUiText} from './donate.i18n';

@Component({
  selector: 'app-donate',
  templateUrl: './donate.html',
  styleUrl: './donate.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Donate {
  private readonly userService = inject(UserService);

  protected readonly sponsorUrl = 'https://github.com/sponsors/Foxugly';
  protected readonly ui = computed(() => getDonateUiText(this.userService.currentLang));
}
