import {Component, computed, effect, inject, OnInit} from '@angular/core';
import {Router, RouterOutlet} from '@angular/router';
import {TopMenuComponent} from './components/topmenu/topmenu';
import {BackendStatusService} from './services/status/status';
import {FooterComponent} from './components/footer/footer';
import {AuthService} from './services/auth/auth';
import {UserService} from './services/user/user';
import {logApiError} from './shared/api/api-errors';
import {ROUTES} from './app.routes-paths';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TopMenuComponent, FooterComponent],
  templateUrl: './app.html',
  //template: `
  //  <app-topmenu></app-topmenu>
  //  <main>
  //    <router-outlet></router-outlet>
  //  </main>
  //    `,
  styleUrl: './app.scss'
})
export class App implements OnInit {
  status = inject(BackendStatusService);
  backendDown = computed(() => this.status.backendUp() === false);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  //protected readonly title = signal('wpref-frontend');

  constructor() {
    effect(() => {
      if (!this.authService.authenticated || !this.userService.requiresPasswordChange()) {
        return;
      }

      const currentUrl = this.router.url;
      if (currentUrl.startsWith('/change-password')) {
        return;
      }

      void this.router.navigate(ROUTES.auth.changePassword(), {
        queryParams: {next: currentUrl},
      });
    });
  }

  ngOnInit(): void {
    if (!this.authService.authenticated || this.userService.currentUser()) {
      return;
    }

    this.userService.getMe().subscribe({
      error: (error) => {
        logApiError('app.session-rehydrate', error);
        this.authService.logout();
      },
    });
  }
}
