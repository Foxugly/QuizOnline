import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
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
import {TurnstileController} from '../../../shared/turnstile/turnstile';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, InputTextModule, MessageModule, ButtonModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPassword implements AfterViewInit, OnDestroy {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly userService = inject(UserService);

  protected readonly turnstile = new TurnstileController();

  @ViewChild('turnstile', {static: false})
  protected turnstileContainer?: ElementRef<HTMLDivElement>;

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

    let turnstileToken = '';
    if (this.turnstile.enabled) {
      turnstileToken = this.turnstile.readToken();
      if (!turnstileToken) {
        this.submitError.set(labels.formInvalid);
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
          console.error(err);
          if (this.turnstile.enabled) this.turnstile.reset();
          this.errorMessage.set(labels.errorGeneric);
        },
      });
  }

  ngAfterViewInit(): void {
    this.turnstile.render(this.turnstileContainer?.nativeElement);
  }

  ngOnDestroy(): void {
    this.turnstile.destroy();
  }

  goHome(): void {
    this.router.navigate(ROUTES.home());
  }

}
