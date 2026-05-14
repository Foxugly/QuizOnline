import {Injectable, effect, inject} from '@angular/core';
import {PrimeNG} from 'primeng/config';

import {UserService} from '../../services/user/user';
import {getPrimeNGTranslation} from './primeng-translations';

/**
 * Keeps PrimeNG's internal Translation in sync with the user's chosen
 * UI language. Without this, paginator aria labels, calendar month/day
 * names, multiselect "Choose…", table empty messages, etc. stay in
 * English regardless of what the rest of the app shows.
 *
 * Wired as an APP_INITIALIZER from ``app.config.ts`` so the dictionary
 * is set before any view is rendered.
 */
@Injectable({providedIn: 'root'})
export class PrimeNGTranslationService {
  private readonly primeng = inject(PrimeNG);
  private readonly userService = inject(UserService);

  constructor() {
    effect(() => {
      this.primeng.setTranslation(getPrimeNGTranslation(this.userService.lang()));
    });
  }
}
