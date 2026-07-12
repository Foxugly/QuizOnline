import {Component, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormBuilder, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {finalize} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {CheckboxModule} from 'primeng/checkbox';
import {InputTextModule} from 'primeng/inputtext';
import {MessageModule} from 'primeng/message';
import {PasswordModule} from 'primeng/password';

import {AuthApi as AuthApiService} from '../../../api/generated/api/auth.service';
import {ROUTES} from '../../../app.routes-paths';
import {AuthService} from '../../../services/auth/auth';
import {ConnectionLogService} from '../../../services/connection-log/connection-log.service';
import {UserService} from '../../../services/user/user';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {logApiError} from '../../../shared/api/api-errors';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    CheckboxModule,
    MessageModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage implements OnInit {
  app = window.__APP__!;
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly connectionLog = inject(ConnectionLogService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  hide = signal(true);
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  infoMsg = signal<string | null>(null);

  // Magic-link mode: hides the email + password fields and asks the
  // user for their email only. The success path replaces the form
  // with a one-line confirmation; no JWT is exchanged here (the user
  // clicks through the email link).
  readonly magicLinkMode = signal(false);
  readonly magicLinkSubmitting = signal(false);
  readonly magicLinkEmail = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
    remember: [false],
  });
  private readonly destroyRef = inject(DestroyRef);
  private readonly authApi = inject(AuthApiService);

  get f() {
    return this.form.controls;
  }

  readonly ui = inject(UiTextService).ui;

  ngOnInit() {
    if (this.route.snapshot.queryParamMap.get('email_confirmation_required') === '1') {
      this.infoMsg.set(this.ui().login.confirmEmailRequired);
    }
  }

  toggleHide() {
    this.hide.update((value) => !value);
  }

  toggleMagicLinkMode(): void {
    this.errorMsg.set(null);
    this.infoMsg.set(null);
    this.magicLinkMode.update((value) => !value);
  }

  submitMagicLink(): void {
    const email = (this.magicLinkEmail() || '').trim();
    if (!email || this.magicLinkSubmitting()) {
      return;
    }
    this.errorMsg.set(null);
    this.infoMsg.set(null);
    this.magicLinkSubmitting.set(true);
    this.authApi.authMagicLinkRequestCreate({
      magicLinkRequestRequestDto: {email},
    } as never)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.magicLinkSubmitting.set(false)),
      )
      .subscribe({
        // Constant-time response: any 2xx maps to the same confirmation.
        next: () => {
          this.infoMsg.set(this.ui().login.magicLinkSent);
          this.magicLinkEmail.set('');
        },
        error: (err) => {
          logApiError('auth.magic-link.request', err);
          this.errorMsg.set(this.ui().login.magicLinkError);
        },
      });
  }

  submit() {
    this.errorMsg.set(null);
    this.infoMsg.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const {email, password, remember} = this.form.getRawValue();
    this.auth.login(email, password, remember).subscribe({
      next: (user) => {
        this.loading.set(false);
        // Fire-and-forget connection-log capture on real success only.
        this.connectionLog.record('password');
        const nextUrl = this.route.snapshot.queryParamMap.get('next');
        if (this.auth.requiresPasswordChange(user)) {
          void this.router.navigate(ROUTES.auth.changePassword(), {
            queryParams: nextUrl ? {next: nextUrl} : undefined,
          });
          return;
        }
        const safeNext = nextUrl && nextUrl.startsWith('/') && !nextUrl.includes('://') ? nextUrl : null;
        void this.router.navigateByUrl(safeNext || ROUTES.home()[0]);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.detail || this.ui().login.invalidCredentials);
      },
    });
  }
}
