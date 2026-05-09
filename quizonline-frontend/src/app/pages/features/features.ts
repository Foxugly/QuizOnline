import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';

import {UserService} from '../../services/user/user';
import {getFeaturesUiText} from './features.i18n';

@Component({
  selector: 'app-features',
  imports: [],
  templateUrl: './features.html',
  styleUrl: './features.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Features {
  private readonly userService = inject(UserService);

  protected readonly ui = computed(() => getFeaturesUiText(this.userService.currentLang));
}
