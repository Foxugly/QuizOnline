import {CommonModule} from '@angular/common';
import {Component, inject, input, output, ChangeDetectionStrategy} from '@angular/core';
import {FormGroup, ReactiveFormsModule} from '@angular/forms';

import {ButtonModule} from 'primeng/button';
import {InputNumberModule} from 'primeng/inputnumber';
import {InputTextModule} from 'primeng/inputtext';
import {MessageModule} from 'primeng/message';
import {PasswordModule} from 'primeng/password';
import {SelectModule} from 'primeng/select';
import {ToggleSwitchModule} from 'primeng/toggleswitch';

import {UiTextService} from '../../shared/i18n/ui-text.service';

type Option<T> = { label: string; value: T };

@Component({
  selector: 'app-user-admin-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    PasswordModule,
    SelectModule,
    ToggleSwitchModule,
  ],
  templateUrl: './user-admin-form.html',
  styleUrl: './user-admin-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAdminFormComponent {
  readonly form = input.required<FormGroup>();
  readonly languageOptions = input.required<Array<Option<string>>>();
  readonly title = input('');
  readonly submitLabel = input('');
  readonly cancelLabel = input('');
  readonly submitError = input<string | null>(null);
  readonly showPassword = input(true);
  readonly showFlags = input(true);
  readonly ui = inject(UiTextService).editor;

  readonly submitForm = output<void>();
  readonly cancel = output<void>();

  submit(): void {
    this.submitForm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
