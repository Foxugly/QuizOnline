import {effect, inject, Injectable} from '@angular/core';
import {TranslocoService} from '@jsverse/transloco';

import {UserService} from '../../services/user/user';

/**
 * Keeps Transloco's active language mirroring the app's language authority
 * (``UserService.lang()``). QuizOnline's source of truth for the active
 * language stays ``UserService`` (persisted to ``localStorage['lang']``); this
 * bridge forwards every change to Transloco so ``| transloco`` / unit tests see
 * the same language as the ``UiTextService`` façade.
 *
 * Instantiated eagerly from ``app.config`` so the sync is live from bootstrap.
 */
@Injectable({providedIn: 'root'})
export class TranslocoLangSync {
  private readonly transloco = inject(TranslocoService);
  private readonly user = inject(UserService);

  constructor() {
    this.transloco.setActiveLang(String(this.user.lang()));
    effect(() => this.transloco.setActiveLang(String(this.user.lang())));
  }
}
