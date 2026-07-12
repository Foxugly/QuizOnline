import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {finalize} from 'rxjs/operators';
import {ActivatedRoute, Router} from '@angular/router';

import {InputTextModule} from 'primeng/inputtext';
import {PasswordModule} from 'primeng/password';
import {ButtonModule} from 'primeng/button';
import {SelectModule} from 'primeng/select';
import {MultiSelectModule} from 'primeng/multiselect';

import {FieldError} from '../../../shared/components/field-error/field-error';

import {AuthService} from '../../../services/auth/auth';
import {LanguageService} from '../../../services/language/language';
import {DomainReadDto} from '../../../api/generated/model/domain-read';
import {LanguageReadDto} from '../../../api/generated/model/language-read';
import {ROUTES} from '../../../app.routes-paths';
import {logApiError, userFacingApiMessage} from '../../../shared/api/api-errors';
import {UserService} from '../../../services/user/user';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {DomainService} from '../../../services/domain/domain';
import {getLocalizedDomainName} from '../../../shared/i18n/domain-label';
import {TurnstileController} from '../../../shared/turnstile/turnstile';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, InputTextModule, PasswordModule, ButtonModule, SelectModule, MultiSelectModule, FieldError],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register implements OnInit, AfterViewInit, OnDestroy {
  app = window.__APP__!;

  protected readonly turnstile = new TurnstileController();

  @ViewChild('turnstile', {static: false})
  protected turnstileContainer?: ElementRef<HTMLDivElement>;

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly languageService = inject(LanguageService);
  private readonly domainService = inject(DomainService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);

  /** Set when the user landed here from an /invite/accept token: pre-fills
   *  and locks the email field so they cannot register under a different
   *  address than the one the inviter typed. */
  readonly invitationToken = signal<string | null>(null);
  readonly emailLocked = signal<boolean>(false);

  form: FormGroup = this.fb.nonNullable.group(
    {
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
  submitted = signal(false);
  isSubmitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  languages = signal<LanguageReadDto[]>([]);
  domains = signal<DomainReadDto[]>([]);
  loadingLanguages = signal(false);
  loadingDomains = signal(false);

  get f() {
    return this.form.controls;
  }

  readonly ui = inject(UiTextService).ui;

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
    this.applyInvitationQueryParams();
  }

  ngAfterViewInit(): void {
    this.turnstile.render(this.turnstileContainer?.nativeElement);
  }

  ngOnDestroy(): void {
    this.turnstile.destroy();
  }

  /**
   * When the user arrives from the ``invite/accept/<token>`` landing page,
   * the page redirects here with ``?invitation=<token>&email=<addr>``. We
   * pre-fill and lock the email so the new account is unambiguously the
   * one the inviter meant. The token is preserved on the URL so a
   * follow-up step (after the post-registration email confirmation) can
   * recover it and complete the join.
   */
  private applyInvitationQueryParams(): void {
    const qp = this.route.snapshot.queryParamMap;
    const token = qp.get('invitation');
    const email = qp.get('email');
    if (token) {
      this.invitationToken.set(token);
    }
    if (email) {
      this.form.get('email')?.setValue(email);
      this.form.get('email')?.disable();
      this.emailLocked.set(true);
    }
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

    let turnstileToken = '';
    if (this.turnstile.enabled) {
      turnstileToken = this.turnstile.readToken();
      if (!turnstileToken) {
        this.errorMessage.set(this.ui().register.submitError);
        return;
      }
    }

    this.isSubmitting.set(true);
    const {email, first_name, last_name, language, requested_domain_ids, password} = this.form.getRawValue();

    this.authService
      .register({
        email,
        first_name,
        last_name,
        language,
        requested_domain_ids,
        password,
        ...(this.turnstile.enabled ? {turnstile_token: turnstileToken} : {}),
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigate(ROUTES.auth.registerPending());
        },
        error: (err) => {
          logApiError('auth.register.submit', err);
          if (this.turnstile.enabled) this.turnstile.reset();
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
          this.errorMessage.set(userFacingApiMessage(err, this.ui().register.loadLanguagesError));
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
            this.errorMessage.set(userFacingApiMessage(err, this.ui().register.loadDomainsError));
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

    return this.ui().register.submitError;
  }

  goRegister(): void {
    this.router.navigate(ROUTES.auth.register());
  }

  goLogin(): void {
    this.router.navigate(ROUTES.auth.login());
  }

  private getDomainLabel(domain: DomainReadDto): string {
    return getLocalizedDomainName(domain, this.userService.currentLang);
  }
}
