import {CommonModule} from '@angular/common';
import {Component, computed, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ButtonModule} from 'primeng/button';

import {ROUTES} from '../../app.routes-paths';
import {AuthService} from '../../services/auth/auth';
import {UserService} from '../../services/user/user';
import {getUiText} from '../../shared/i18n/ui-text';

type QuickLinkKey = 'catalog' | 'preferences' | 'about';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink, ButtonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  readonly app = window.__APP__!;
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  readonly ui = computed(() => getUiText(this.userService.currentLang));

  readonly isAuthenticated = computed(() => this.auth.isLoggedIn());
  readonly isAdmin = this.userService.isAdmin;
  readonly primaryCta = computed(() =>
    this.isAuthenticated() ? ROUTES.quiz.list() : ROUTES.auth.login(),
  );
  readonly primaryCtaLabel = computed(() =>
    this.isAuthenticated() ? this.ui().home.primaryLoggedIn : this.ui().home.primaryLoggedOut,
  );
  readonly secondaryCta = computed(() =>
    this.isAdmin() ? ROUTES.quiz.add() : ROUTES.auth.register(),
  );
  readonly secondaryCtaLabel = computed(() =>
    this.isAdmin() ? this.ui().home.secondaryAdmin : this.ui().home.secondaryLoggedOut,
  );

  readonly quickLinks = [
    {key: 'catalog' as QuickLinkKey, link: ROUTES.quiz.list()},
    {key: 'preferences' as QuickLinkKey, link: ['/preferences'] as const},
    {key: 'about' as QuickLinkKey, link: ['/about'] as const},
  ];
}
