import {Component, computed, DestroyRef, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {finalize} from 'rxjs/operators';

import {ButtonModule} from 'primeng/button';
import {MessageModule} from 'primeng/message';

import {AuthService} from '../../../services/auth/auth';
import {ROUTES} from '../../../app.routes-paths';
import {UserService} from '../../../services/user/user';
import {getEditorUiText} from '../../../shared/i18n/editor-ui-text';

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

  readonly ui = computed(() => getEditorUiText(this.userService.currentLang));

  readonly loading = signal(true);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const uid = params.get('uid') ?? '';
      const token = params.get('token') ?? '';

      if (!uid || !token) {
        this.loading.set(false);
        this.errorMessage.set('Lien de confirmation invalide ou incomplet.');
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
            this.successMessage.set(response.detail || 'Adresse email confirmee avec succes.');
          },
          error: (err) => {
            this.errorMessage.set(err?.error?.detail || 'Impossible de confirmer cette adresse email.');
          },
        });
    });
  }

  goLogin(): void {
    this.router.navigate(ROUTES.auth.login());
  }
}
