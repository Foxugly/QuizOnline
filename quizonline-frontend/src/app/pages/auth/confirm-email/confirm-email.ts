import {Component, computed, DestroyRef, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {ActivatedRoute, Router} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {finalize} from 'rxjs/operators';

import {ButtonModule} from 'primeng/button';
import {MessageModule} from 'primeng/message';

import {AuthService} from '../../../services/auth/auth';
import {ROUTES} from '../../../app.routes-paths';
import {UserService} from '../../../services/user/user';

@Component({
  selector: 'app-confirm-email',
  imports: [MessageModule, ButtonModule],
  templateUrl: './confirm-email.html',
  styleUrl: './confirm-email.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmEmailPage {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly userService = inject(UserService);

  readonly ui = inject(UiTextService).editor;
  readonly shellUi = inject(UiTextService).ui;

  readonly loading = signal(true);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const labels = this.shellUi().confirmEmail;
      const uid = params.get('uid') ?? '';
      const token = params.get('token') ?? '';

      if (!uid || !token) {
        this.loading.set(false);
        this.errorMessage.set(labels.invalidLink);
        return;
      }

      this.loading.set(true);
      this.successMessage.set(null);
      this.errorMessage.set(null);

      this.authService.confirmEmail({uid, token})
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.loading.set(false)),
        )
        .subscribe({
          next: (response) => {
            this.successMessage.set(response.detail || labels.successFallback);
          },
          error: (err) => {
            this.errorMessage.set(err?.error?.detail || labels.errorFallback);
          },
        });
    });
  }

  goLogin(): void {
    this.router.navigate(ROUTES.auth.login());
  }
}
