import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {NonNullableFormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {finalize} from 'rxjs/operators';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

import {InputTextModule} from 'primeng/inputtext';
import {MessageModule} from 'primeng/message';
import {ButtonModule} from 'primeng/button';
import {AuthCardComponent} from '../../../shared/components/auth-card/auth-card.component';
import {authErrorMessage} from '../../../shared/api/auth-errors';
import {logApiError} from '../../../shared/api/api-errors';

import {AuthService} from '../../../services/auth/auth';
import {TurnstileController} from '../../../shared/turnstile/turnstile';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, InputTextModule, MessageModule, ButtonModule, AuthCardComponent],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPassword implements AfterViewInit, OnDestroy {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly turnstile = new TurnstileController();

  @ViewChild('turnstile', {static: false})
  protected turnstileContainer?: ElementRef<HTMLDivElement>;

  readonly shellUi = inject(UiTextService).ui;

  // State
  readonly submitted = signal(false);
  readonly isSubmitting = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  // Typed Form
  readonly form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
  });

  onSubmit(): void {
    const labels = this.shellUi().resetPassword;
    this.submitted.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set(labels.formInvalid);
      return;
    }

    const email = this.form.controls.email.value.trim();
    if (!email) {
      this.errorMessage.set(labels.emailRequired);
      return;
    }

    let turnstileToken = '';
    if (this.turnstile.enabled) {
      turnstileToken = this.turnstile.readToken();
      if (!turnstileToken) {
        this.errorMessage.set(this.shellUi().authErrors.captcha);
        return;
      }
    }

    this.isSubmitting.set(true);

    this.authService
      .requestPasswordReset({
        email,
        ...(this.turnstile.enabled ? {turnstile_token: turnstileToken} : {}),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: () => {
          this.successMessage.set(labels.successMessage);
        },
        error: (err) => {
          logApiError('auth.password-reset.request', err);
          if (this.turnstile.enabled) this.turnstile.reset();
          this.errorMessage.set(authErrorMessage(err, this.shellUi(), {fallback: labels.errorGeneric}));
        },
      });
  }

  ngAfterViewInit(): void {
    this.turnstile.render(this.turnstileContainer?.nativeElement);
  }

  ngOnDestroy(): void {
    this.turnstile.destroy();
  }

}
