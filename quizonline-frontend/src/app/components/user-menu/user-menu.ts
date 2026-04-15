import {Component, HostListener, inject, signal} from '@angular/core';
import {Router} from '@angular/router';

import {AuthService} from '../../services/auth/auth';
import {UserService} from '../../services/user/user';
import {getUiText} from '../../shared/i18n/ui-text';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  templateUrl: './user-menu.html',
  styleUrl: './user-menu.scss',
})
export class UserMenuComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  protected readonly open = signal(false);

  get ui() {
    return getUiText(this.userService.currentLang);
  }

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

  @HostListener('document:click')
  closeMenu() {
    this.open.set(false);
  }
}
