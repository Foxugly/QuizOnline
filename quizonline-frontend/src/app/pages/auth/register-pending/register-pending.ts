import {Component, inject, ChangeDetectionStrategy} from '@angular/core';
import {Router} from '@angular/router';

import {ButtonModule} from 'primeng/button';

import {ROUTES} from '../../../app.routes-paths';
import {UserService} from '../../../services/user/user';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {AuthCardComponent} from '../../../shared/components/auth-card/auth-card.component';

@Component({
  selector: 'app-register-pending',
  imports: [ButtonModule, AuthCardComponent],
  templateUrl: './register-pending.html',
  styleUrl: './register-pending.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPendingPage {
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  app = window.__APP__!;

  readonly ui = inject(UiTextService).ui;

  goLogin(): void {
    void this.router.navigate(ROUTES.auth.login());
  }
}
