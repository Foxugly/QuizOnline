import {Component, OnInit, ChangeDetectionStrategy, signal} from '@angular/core';
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
import {MultiSelectModule} from 'primeng/multiselect';

import {AuthService} from '../../../services/auth/auth';
import {LanguageService} from '../../../services/language/language';
import {DomainReadDto} from '../../../api/generated/model/domain-read';
import {LanguageReadDto} from '../../../api/generated/model/language-read';
import {ROUTES} from '../../../app.routes-paths';
import {logApiError, userFacingApiMessage} from '../../../shared/api/api-errors';
import {UserService} from '../../../services/user/user';
import {getUiText} from '../../../shared/i18n/ui-text';
import {DomainService, DomainTranslations} from '../../../services/domain/domain';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, InputTextModule, PasswordModule, ButtonModule, SelectModule, MultiSelectModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register implements OnInit {
  app = window.__APP__!;

  form: FormGroup;
  submitted = signal(false);
  isSubmitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  languages = signal<LanguageReadDto[]>([]);
  domains = signal<DomainReadDto[]>([]);
  loadingLanguages = signal(false);
  loadingDomains = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private languageService: LanguageService,
    private domainService: DomainService,
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
        requested_domain_ids: [[] as number[]],
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

  get domainOptions() {
    return this.domains().map((domain) => ({
      label: this.getDomainLabel(domain),
      value: domain.id,
    }));
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
    this.loadDomains();
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.form.updateValueAndValidity();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const {username, email, first_name, last_name, language, requested_domain_ids, password} = this.form.getRawValue();

    this.authService
      .register({username, email, first_name, last_name, language, requested_domain_ids, password})
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigate(ROUTES.auth.registerPending());
        },
        error: (err) => {
          logApiError('auth.register.submit', err);
          this.errorMessage.set(this.formatRegisterError(err));
        },
      });
  }

  private loadLanguages(): void {
    this.loadingLanguages.set(true);

    this.languageService
      .list()
      .pipe(finalize(() => this.loadingLanguages.set(false)))
      .subscribe({
        next: (langs) => {
          const active = (langs ?? []).filter((lang: any) => lang?.active !== false);
          this.languages.set(active);

          if (!this.form.get('language')?.value) {
            const defaultLang = active[0]?.code ?? 'en';
            this.form.get('language')?.setValue(String(defaultLang));
          }
        },
        error: (err) => {
          logApiError('auth.register.load-languages', err);
          this.languages.set([]);
          this.errorMessage.set(userFacingApiMessage(err, this.ui.register.loadLanguagesError));
          if (!this.form.get('language')?.value) {
            this.form.get('language')?.setValue('en');
          }
        },
      });
  }

  private loadDomains(): void {
    this.loadingDomains.set(true);

    this.domainService
      .availableForLinking()
      .pipe(finalize(() => this.loadingDomains.set(false)))
      .subscribe({
        next: (domains) => {
          this.domains.set(domains ?? []);
        },
        error: (err) => {
          logApiError('auth.register.load-domains', err);
          this.domains.set([]);
          if (!this.errorMessage()) {
            this.errorMessage.set(userFacingApiMessage(err, this.ui.register.loadDomainsError));
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

  private getDomainLabel(domain: DomainReadDto): string {
    const translations = domain.translations as DomainTranslations | undefined;
    const lang = this.userService.currentLang;
    const current = translations?.[lang]?.name?.trim();
    if (current) {
      return current;
    }

    for (const fallback of ['fr', 'en', 'nl']) {
      const value = translations?.[fallback]?.name?.trim();
      if (value) {
        return value;
      }
    }

    return `Domain #${domain.id}`;
  }
}
