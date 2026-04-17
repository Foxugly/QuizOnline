import {Component, ChangeDetectionStrategy, inject} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';

import {InputTextModule} from 'primeng/inputtext';
import {PasswordModule} from 'primeng/password';
import {ButtonModule} from 'primeng/button';
import {MessageModule} from 'primeng/message';

import {AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {AuthService} from '../../../services/auth/auth';
import {PasswordChangeRequestDto} from '../../../api/generated/model/password-change-request';
import {environment} from '../../../../environments/environment';
import {UserService} from '../../../services/user/user';
import {ROUTES} from '../../../app.routes-paths';
import {getUiText} from '../../../shared/i18n/ui-text';

(window as any).__APP__ = {
  name: environment.appName,
  author: environment.author,
  year: environment.year,
  logoSvg: environment.logoSvg,
  logoIco: environment.logoIco,
  logoPng: environment.logoPng,
};

@Component({
  selector: 'app-change-password',
  imports: [ReactiveFormsModule, InputTextModule, PasswordModule, ButtonModule, MessageModule],
  templateUrl: './change-password.html',
  styleUrl: './change-password.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordPage {
  app = window.__APP__!;

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  form: FormGroup = this.fb.nonNullable.group(
    {
      old_password: ['', [Validators.required]],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_new_password: ['', [Validators.required]],
    },
    {
      validators: [this.passwordsMatchValidator],
    },
  );
  submitted = false;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';
  infoMessage = this.userService.requiresPasswordChange()
    ? this.ui.changePassword.forceMessage
    : '';

  get ui() {
    return getUiText(this.userService.currentLang);
  }

  private passwordsMatchValidator(group: AbstractControl) {
    const newPwd = group.get('new_password')?.value;
    const confirm = group.get('confirm_new_password')?.value;

    if (newPwd && confirm && newPwd !== confirm) {
      group.get('confirm_new_password')?.setErrors({passwordMismatch: true});
    } else {
      const ctrl = group.get('confirm_new_password');
      if (!ctrl) {
        return null;
      }

      const errors = ctrl.errors;
      if (errors && errors['passwordMismatch']) {
        delete errors['passwordMismatch'];
        ctrl.setErrors(Object.keys(errors).length ? errors : null);
      }
    }
    return null;
  }

  get f() {
    return this.form.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const payload: PasswordChangeRequestDto = this.form.getRawValue();

    this.authService.changePassword(payload).subscribe({
      next: () => {
        this.userService.getMe().subscribe({
          next: () => {
            this.handlePasswordChangeSuccess();
          },
          error: () => {
            this.handlePasswordChangeSuccess();
          },
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error(err);

        if (err.status === 400 && err.error) {
          const e = err.error;
          if (e.old_password && Array.isArray(e.old_password)) {
            this.errorMessage = e.old_password.join(' ');
            return;
          }
          if (e.new_password1 && Array.isArray(e.new_password1)) {
            this.errorMessage = e.new_password1.join(' ');
            return;
          }
          if (e.non_field_errors && Array.isArray(e.non_field_errors)) {
            this.errorMessage = e.non_field_errors.join(' ');
            return;
          }
          if (typeof e.detail === 'string' && e.detail) {
            this.errorMessage = e.detail;
            return;
          }
        }

        this.errorMessage = this.ui.changePassword.error;
      },
    });
  }

  private handlePasswordChangeSuccess(): void {
    this.isSubmitting = false;
    this.successMessage = this.ui.changePassword.success;
    this.infoMessage = '';
    this.form.reset();
    this.submitted = false;
    const nextUrl = this.route.snapshot.queryParamMap.get('next');
    const safeNext = nextUrl && nextUrl.startsWith('/') && !nextUrl.includes('://') ? nextUrl : null;
    void this.router.navigateByUrl(safeNext || ROUTES.home()[0]);
  }
}
