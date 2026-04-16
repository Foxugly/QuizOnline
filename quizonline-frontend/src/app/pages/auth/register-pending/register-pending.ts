import {Component, inject, ChangeDetectionStrategy} from '@angular/core';
import {Router} from '@angular/router';

import {ButtonModule} from 'primeng/button';

import {ROUTES} from '../../../app.routes-paths';
import {UserService} from '../../../services/user/user';
import {getUiText} from '../../../shared/i18n/ui-text';

@Component({
  selector: 'app-register-pending',
  imports: [ButtonModule],
  templateUrl: './register-pending.html',
  styleUrl: './register-pending.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPendingPage {
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  app = window.__APP__!;

  get ui() {
    return getUiText(this.userService.currentLang);
  }

  goLogin(): void {
    void this.router.navigate(ROUTES.auth.login());
  }
}
