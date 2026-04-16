import {CommonModule} from '@angular/common';
import {Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {ButtonModule} from 'primeng/button';
import {CheckboxModule} from 'primeng/checkbox';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {DialogModule} from 'primeng/dialog';
import {InputTextModule} from 'primeng/inputtext';
import {TableModule} from 'primeng/table';
import {ToggleSwitchModule} from 'primeng/toggleswitch';
import {ConfirmationService} from 'primeng/api';

import {LanguageApi as LanguageApiService} from '../../../api/generated/api/language.service';
import {LanguageReadDto} from '../../../api/generated/model/language-read';
import {LanguageWriteRequestDto} from '../../../api/generated/model/language-write-request';
import {PatchedLanguagePartialRequestDto} from '../../../api/generated/model/patched-language-partial-request';
import {UserService} from '../../../services/user/user';
import {getUiText} from '../../../shared/i18n/ui-text';
import {logApiError} from '../../../shared/api/api-errors';

@Component({
  selector: 'app-language-management',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CheckboxModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    TableModule,
    ToggleSwitchModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './language-management.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageManagementPage implements OnInit {
  private readonly api = inject(LanguageApiService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmationService = inject(ConfirmationService);

  readonly ui = computed(() => getUiText(this.userService.currentLang));
  readonly t = computed(() => this.ui().admin.languages);

  readonly languages = signal<LanguageReadDto[]>([]);
  readonly dialogVisible = signal(false);
  readonly editing = signal<LanguageReadDto | null>(null);

  formCode = '';
  formName = '';
  formActive = true;

  rows = 10;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api
      .langList({})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => this.languages.set(response.results ?? []),
        error: (err: unknown) => {
          logApiError('languages.load', err);
          this.languages.set([]);
        },
      });
  }

  openCreate(): void {
    this.editing.set(null);
    this.formCode = '';
    this.formName = '';
    this.formActive = true;
    this.dialogVisible.set(true);
  }

  openEdit(lang: LanguageReadDto): void {
    this.editing.set(lang);
    this.formCode = lang.code;
    this.formName = lang.name;
    this.formActive = lang.active;
    this.dialogVisible.set(true);
  }

  save(): void {
    const dto: LanguageWriteRequestDto = {
      code: this.formCode,
      name: this.formName,
      active: this.formActive,
    };

    const edit = this.editing();
    const request$ = edit
      ? this.api.langUpdate({langId: edit.id, languageWriteRequestDto: dto})
      : this.api.langCreate({languageWriteRequestDto: dto});

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.dialogVisible.set(false);
        this.load();
      },
      error: (err: unknown) => logApiError('languages.save', err),
    });
  }

  onActiveToggle(lang: LanguageReadDto, active: boolean): void {
    const dto: PatchedLanguagePartialRequestDto = {active};
    this.api
      .langPartialUpdate({langId: lang.id, patchedLanguagePartialRequestDto: dto})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.load(),
        error: (err: unknown) => logApiError('languages.toggleActive', err),
      });
  }

  confirmDelete(lang: LanguageReadDto): void {
    this.confirmationService.confirm({
      message: this.t().deleteConfirm,
      accept: () => {
        this.api
          .langDestroy({langId: lang.id})
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.load(),
            error: (err: unknown) => logApiError('languages.delete', err),
          });
      },
    });
  }
}
