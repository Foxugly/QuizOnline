import {effect, inject, Injectable, signal} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {RouterStateSnapshot, TitleStrategy} from '@angular/router';

import {environment} from '../../../environments/environment';
import {UserService} from '../../services/user/user';
import {catalogString} from './catalog-registry';

/**
 * Tab title « {page title} — {app name} » (fleet standard, WCAG 2.4.2).
 *
 * Routes opt in with ``data: {titleKey: 'ui.login.title'}`` — a dotted path
 * into the root i18n catalog (``ui.*``, ``editor.*``, ``pages.*``). The deepest
 * route carrying a key wins; routes without one show the app name only. The
 * title is recomputed when the user switches language.
 */
@Injectable({providedIn: 'root'})
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly userService = inject(UserService);
  private readonly titleKey = signal<string | null>(null);

  constructor() {
    super();
    effect(() => {
      const key = this.titleKey();
      const page = key ? catalogString(this.userService.lang(), key) : null;
      this.title.setTitle(page ? `${page} — ${environment.appName}` : environment.appName);
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    let key: string | null = null;
    let route = snapshot.root;
    while (route) {
      const candidate = route.data?.['titleKey'];
      if (typeof candidate === 'string') {
        key = candidate;
      }
      route = route.firstChild!;
    }
    this.titleKey.set(key);
  }
}
