import {Component, inject, OnInit, signal} from '@angular/core';
import {FormBuilder, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {CheckboxModule} from 'primeng/checkbox';
import {InputTextModule} from 'primeng/inputtext';
import {MessageModule} from 'primeng/message';
import {PasswordModule} from 'primeng/password';

import {ROUTES} from '../../../app.routes-paths';
import {AuthService} from '../../../services/auth/auth';
import {UserService} from '../../../services/user/user';
import {getUiText} from '../../../shared/i18n/ui-text';

@Component({
  standalone: true,
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
})
export class LoginPage implements OnInit {
  app = window.__APP__!;
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  hide = signal(true);
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  infoMsg = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(4)]],
    remember: [false],
  });

  get f() {
    return this.form.controls;
  }

  get ui() {
    return getUiText(this.userService.currentLang);
  }

  ngOnInit() {
    if (this.route.snapshot.queryParamMap.get('email_confirmation_required') === '1') {
      this.infoMsg.set(this.ui.login.confirmEmailRequired);
    }
  }

  toggleHide() {
    this.hide.update((value) => !value);
  }

  submit() {
    this.errorMsg.set(null);
    this.infoMsg.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const {username, password, remember} = this.form.getRawValue();
    this.auth.login(username, password, remember).subscribe({
      next: (user) => {
        this.loading.set(false);
        const nextUrl = this.route.snapshot.queryParamMap.get('next');
        if (this.auth.requiresPasswordChange(user)) {
          void this.router.navigate(ROUTES.auth.changePassword(), {
            queryParams: nextUrl ? {next: nextUrl} : undefined,
          });
          return;
        }
        void this.router.navigateByUrl(nextUrl || ROUTES.home()[0]);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.detail || this.ui.login.invalidCredentials);
      },
    });
  }
}
