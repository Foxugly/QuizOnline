import {Component, computed, DestroyRef, effect, inject, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Router, RouterOutlet} from '@angular/router';
import {BackendStatusService} from './services/status/status';
import {AuthService} from './services/auth/auth';
import {UserService} from './services/user/user';
import {logApiError} from './shared/api/api-errors';
import {requiredSessionRedirect} from './shared/auth/session-access-policy';
import {ROUTES} from './app.routes-paths';
import {Toast} from 'primeng/toast';

@Component({
  selector: 'app-root',
  // Minimal shell root: the global backend-down banner and a single
  // ``<p-toast>`` above every page, then the ``<router-outlet>`` whose routes
  // render inside the ``public-layout`` / ``main-layout`` shells (which own the
  // skip-link, topmenu, ``<main>`` and footer).
  imports: [RouterOutlet, Toast],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  status = inject(BackendStatusService);
  backendDown = computed(() => this.status.backendUp() === false);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  //protected readonly title = signal('quizonline-frontend');

  constructor() {
    effect(() => {
      const redirect = requiredSessionRedirect(
        this.userService.currentUser(),
        this.router.url,
        {
          authenticated: this.authService.authenticated,
          requiresEmailConfirmation: (user) => this.userService.shouldConfirmEmail(user),
          requiresPasswordChange: (user) => this.userService.shouldForcePasswordChange(user),
        },
      );
      if (!redirect || redirect.kind !== 'login') {
        return;
      }

      this.authService.logout();
      void this.router.navigate(ROUTES.auth.login(), {
        queryParams: redirect.queryParams,
      });
    });

    effect(() => {
      const redirect = requiredSessionRedirect(
        this.userService.currentUser(),
        this.router.url,
        {
          authenticated: this.authService.authenticated,
          requiresEmailConfirmation: (user) => this.userService.shouldConfirmEmail(user),
          requiresPasswordChange: (user) => this.userService.shouldForcePasswordChange(user),
        },
      );
      if (!redirect || redirect.kind !== 'change-password') {
        return;
      }

      void this.router.navigate(ROUTES.auth.changePassword(), {
        queryParams: redirect.queryParams,
      });
    });
  }

  ngOnInit(): void {
    if (!this.authService.authenticated || this.userService.currentUser()) {
      return;
    }

    this.userService.getMe().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      error: (error) => {
        logApiError('app.session-rehydrate', error);
        this.authService.logout();
      },
    });
  }
}
