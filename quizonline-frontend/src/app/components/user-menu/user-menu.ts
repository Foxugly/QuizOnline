import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {Router} from '@angular/router';

import {AuthService} from '../../services/auth/auth';
import {UserService} from '../../services/user/user';
import {UiTextService} from '../../shared/i18n/ui-text.service';

@Component({
  selector: 'app-user-menu',
  templateUrl: './user-menu.html',
  styleUrl: './user-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'(document:click)': 'closeMenu()'},
})
export class UserMenuComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  protected readonly open = signal(false);

  readonly ui = inject(UiTextService).ui;

  goPreferences() {
    this.open.set(false);
    void this.router.navigate(['/preferences']);
  }

  goChangePassword() {
    this.open.set(false);
    void this.router.navigate(['/change-password']);
  }

  logout() {
    this.open.set(false);
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  goLogin() {
    void this.router.navigate(['/login']);
  }

  toggleMenu(event?: Event) {
    event?.stopPropagation();
    this.open.update((value) => !value);
  }

  closeMenu() {
    this.open.set(false);
  }
}
