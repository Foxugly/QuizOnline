import {CommonModule} from '@angular/common';
import {Component, DestroyRef, inject, OnInit, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {finalize, forkJoin, of} from 'rxjs';
import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {InputTextModule} from 'primeng/inputtext';
import {SelectModule} from 'primeng/select';
import {CustomUserReadDto, DomainReadDto, LanguageEnumDto} from '../../../api/generated';
import {DomainService, DomainTranslations} from '../../../services/domain/domain';
import {UserService} from '../../../services/user/user';
import {getUiText} from '../../../shared/i18n/ui-text';

@Component({
  selector: 'app-preferences',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    SelectModule,
  ],
  templateUrl: './preferences.html',
  styleUrl: './preferences.scss',
})
export class Preferences implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly domainService = inject(DomainService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly domains = signal<DomainReadDto[]>([]);
  readonly currentUser = signal<CustomUserReadDto | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: [{value: '', disabled: true}],
    email: ['', [Validators.email]],
    first_name: [''],
    last_name: [''],
    language: [LanguageEnumDto.En, [Validators.required]],
    current_domain: [null as number | null],
  });

  get ui() {
    return getUiText(this.userService.currentLang);
  }

  get languageOptions() {
    return [
      {label: 'Français', value: LanguageEnumDto.Fr},
      {label: 'Nederlands', value: LanguageEnumDto.Nl},
      {label: 'English', value: LanguageEnumDto.En},
      {label: 'Italiano', value: LanguageEnumDto.It},
      {label: 'Español', value: LanguageEnumDto.Es},
    ];
  }

  get domainOptions() {
    return this.domains().map((domain) => ({
      label: this.getDomainLabel(domain),
      value: domain.id,
    }));
  }

  get roleLabel(): string {
    const me = this.currentUser();
    if (!me) {
      return '-';
    }
    if (me.is_superuser) {
      return this.ui.preferences.roleSuperuser;
    }
    if (me.is_staff) {
      return this.ui.preferences.roleStaff;
    }
    return this.ui.preferences.roleUser;
  }

  ngOnInit(): void {
    this.loading.set(true);
    forkJoin({
      me: this.userService.currentUser()
        ? of(this.userService.currentUser() as CustomUserReadDto)
        : this.userService.getMe(),
      domains: this.domainService.list(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({me, domains}) => {
          const currentUser = Array.isArray(me) ? me[0] : me;
          this.currentUser.set(currentUser);
          this.domains.set(domains ?? []);
          this.form.patchValue({
            username: currentUser.username ?? '',
            email: currentUser.email ?? '',
            first_name: currentUser.first_name ?? '',
            last_name: currentUser.last_name ?? '',
            language: currentUser.language ?? LanguageEnumDto.En,
            current_domain: currentUser.current_domain ?? null,
          });
        },
        error: () => {
          this.error.set(this.ui.preferences.loadError);
        },
      });
  }

  save(): void {
    this.error.set(null);
    this.success.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const me = this.currentUser();
    if (!me) {
      this.error.set(this.ui.preferences.userMissing);
      return;
    }

    const raw = this.form.getRawValue();
    this.saving.set(true);

    forkJoin({
      profile: this.userService.updateMeProfile({
        email: raw.email || '',
        first_name: raw.first_name || '',
        last_name: raw.last_name || '',
        language: raw.language,
      }),
      domain: me.current_domain !== raw.current_domain
        ? this.userService.setCurrentDomain(raw.current_domain)
        : this.userService.currentUser()
          ? of(this.userService.currentUser() as CustomUserReadDto)
          : this.userService.getMe(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: ({domain}) => {
          const updatedUser = Array.isArray(domain) ? domain[0] : domain;
          this.currentUser.set(updatedUser);
          this.form.patchValue({
            username: updatedUser.username ?? '',
            email: updatedUser.email ?? '',
            first_name: updatedUser.first_name ?? '',
            last_name: updatedUser.last_name ?? '',
            language: updatedUser.language ?? LanguageEnumDto.En,
            current_domain: updatedUser.current_domain ?? null,
          });
          this.success.set(this.ui.preferences.saveSuccess);
        },
        error: () => {
          this.error.set(this.ui.preferences.saveError);
        },
      });
  }

  goChangePassword(): void {
    void this.router.navigate(['/change-password']);
  }

  private getDomainLabel(domain: DomainReadDto): string {
    const translations = domain.translations as DomainTranslations | undefined;
    const lang = this.userService.currentLang;
    const current = translations?.[lang]?.name?.trim();
    if (current) {
      return current;
    }

    for (const fallback of [LanguageEnumDto.Fr, LanguageEnumDto.En, LanguageEnumDto.Nl]) {
      const value = translations?.[fallback]?.name?.trim();
      if (value) {
        return value;
      }
    }

    return `Domain #${domain.id}`;
  }
}
