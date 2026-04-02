import {Component, OnInit} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {finalize} from 'rxjs/operators';
import {Router} from '@angular/router';

import {InputTextModule} from 'primeng/inputtext';
import {PasswordModule} from 'primeng/password';
import {ButtonModule} from 'primeng/button';
import {SelectModule} from 'primeng/select';

import {AuthService} from '../../../services/auth/auth';
import {LanguageService} from '../../../services/language/language';
import {LanguageReadDto} from '../../../api/generated';
import {ROUTES} from '../../../app.routes-paths';
import {logApiError, userFacingApiMessage} from '../../../shared/api/api-errors';
import {UserService} from '../../../services/user/user';
import {getUiText} from '../../../shared/i18n/ui-text';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, InputTextModule, PasswordModule, ButtonModule, SelectModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
})
export class Register implements OnInit {
  app = window.__APP__!;

  form: FormGroup;
  submitted = false;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';
  languages: LanguageReadDto[] = [];
  loadingLanguages = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private languageService: LanguageService,
    private router: Router,
    private userService: UserService,
  ) {
    this.form = this.fb.nonNullable.group(
      {
        username: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        first_name: ['', [Validators.required]],
        last_name: ['', [Validators.required]],
        language: ['', [Validators.required]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirm_password: ['', [Validators.required]],
      },
      {validators: [Register.passwordsMatchValidator]},
    );
  }

  get f() {
    return this.form.controls;
  }

  get ui() {
    return getUiText(this.userService.currentLang);
  }

  private static passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const pwd = control.get('password')?.value;
    const confirmCtrl = control.get('confirm_password');
    const confirm = confirmCtrl?.value;

    if (!confirmCtrl || !pwd || !confirm) {
      return null;
    }

    if (pwd !== confirm) {
      const current = confirmCtrl.errors ?? {};
      if (!current['passwordMismatch']) {
        confirmCtrl.setErrors({...current, passwordMismatch: true});
      }
    } else {
      const current = confirmCtrl.errors ?? {};
      if (current['passwordMismatch']) {
        const {passwordMismatch, ...rest} = current;
        confirmCtrl.setErrors(Object.keys(rest).length ? rest : null);
      }
    }

    return null;
  }

  ngOnInit(): void {
    this.loadLanguages();
  }

  onSubmit(): void {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.form.updateValueAndValidity();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const {username, email, first_name, last_name, language, password} = this.form.getRawValue();

    this.authService
      .register({username, email, first_name, last_name, language, password})
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.successMessage = this.ui.register.success;
          this.submitted = false;
          this.form.reset();
          const defaultLang = this.languages[0]?.code ?? 'en';
          this.form.get('language')?.setValue(String(defaultLang));
        },
        error: (err) => {
          logApiError('auth.register.submit', err);
          this.errorMessage = this.formatRegisterError(err);
        },
      });
  }

  private loadLanguages(): void {
    this.loadingLanguages = true;

    this.languageService
      .list()
      .pipe(finalize(() => (this.loadingLanguages = false)))
      .subscribe({
        next: (langs) => {
          const active = (langs ?? []).filter((lang: any) => lang?.active !== false);
          this.languages = active;

          if (!this.form.get('language')?.value) {
            const defaultLang = active[0]?.code ?? 'en';
            this.form.get('language')?.setValue(String(defaultLang));
          }
        },
        error: (err) => {
          logApiError('auth.register.load-languages', err);
          this.languages = [];
          this.errorMessage = userFacingApiMessage(err, this.ui.register.loadLanguagesError);
          if (!this.form.get('language')?.value) {
            this.form.get('language')?.setValue('en');
          }
        },
      });
  }

  private formatRegisterError(err: any): string {
    const data = err?.error;

    if (typeof data?.detail === 'string' && data.detail.trim()) {
      return data.detail;
    }

    if (data && typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length) {
        const value = data[keys[0]];
        if (Array.isArray(value) && typeof value[0] === 'string') {
          return value[0];
        }
        if (typeof value === 'string') {
          return value;
        }
      }
    }

    return this.ui.register.submitError;
  }

  goRegister(): void {
    this.router.navigate(ROUTES.auth.register());
  }

  goLogin(): void {
    this.router.navigate(ROUTES.auth.login());
  }
}
