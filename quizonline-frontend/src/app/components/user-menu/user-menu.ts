import {ChangeDetectionStrategy, Component, OnInit, inject, signal} from '@angular/core';
import {Router} from '@angular/router';

import {ME_INVITATIONS} from '../../app.routes-paths';
import {AuthService} from '../../services/auth/auth';
import {InvitationCountService} from '../../services/invitation/invitation-count.service';
import {UiTextService} from '../../shared/i18n/ui-text.service';

@Component({
  selector: 'app-user-menu',
  templateUrl: './user-menu.html',
  styleUrl: './user-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'(document:click)': 'closeMenu()'},
})
export class UserMenuComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly invitationCount = inject(InvitationCountService);

  protected readonly open = signal(false);

  readonly ui = inject(UiTextService).ui;

  ngOnInit(): void {
    // The dropdown badge needs the pending count even before the
    // user opens the menu — fire once on mount.
    this.invitationCount.ensureLoaded();
  }

  goPreferences() {
    this.open.set(false);
    void this.router.navigate(['/preferences']);
  }

  goChangePassword() {
    this.open.set(false);
    void this.router.navigate(['/change-password']);
  }

  goMyInvitations() {
    this.open.set(false);
    void this.router.navigateByUrl(ME_INVITATIONS);
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
