import {Component, computed, DestroyRef, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {NonNullableFormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {finalize} from 'rxjs/operators';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

import {InputTextModule} from 'primeng/inputtext';
import {MessageModule} from 'primeng/message';
import {ButtonModule} from 'primeng/button';

import {AuthService} from '../../../services/auth/auth';
import {ROUTES} from '../../../app.routes-paths';
import {UserService} from '../../../services/user/user';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, InputTextModule, MessageModule, ButtonModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPassword {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly userService = inject(UserService);

  readonly ui = inject(UiTextService).editor;
  readonly shellUi = inject(UiTextService).ui;

  // State
  readonly submitted = signal(false);
  readonly isSubmitting = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly submitError = signal<string | null>(null);
  readonly loading = signal(false);

  // Typed Form
  readonly form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
  });

  onSubmit(): void {
    const labels = this.shellUi().resetPassword;
    this.submitted.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.submitError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError.set(labels.formInvalid);
      return;
    }

    const email = this.form.controls.email.value.trim();
    if (!email) {
      this.submitError.set(labels.emailRequired);
      return;
    }

    this.isSubmitting.set(true);

    this.authService
      .requestPasswordReset({email})
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: () => {
          this.successMessage.set(labels.successMessage);
        },
        error: (err) => {
          console.error(err);
          this.errorMessage.set(labels.errorGeneric);
        },
      });
  }

  goHome(): void {
    this.router.navigate(ROUTES.home());
  }

}
