import {CommonModule} from '@angular/common';
import {Component, input, output} from '@angular/core';
import {FormGroup, ReactiveFormsModule} from '@angular/forms';

import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {Editor} from 'primeng/editor';
import {InputTextModule} from 'primeng/inputtext';
import {MessageModule} from 'primeng/message';
import {PickListModule} from 'primeng/picklist';
import {SelectModule} from 'primeng/select';
import {SelectButtonModule} from 'primeng/selectbutton';
import {TabsModule} from 'primeng/tabs';
import {ToggleSwitchModule} from 'primeng/toggleswitch';

type UserOption = { label: string; value: number };
type LangOption = { label: string; value: string };

@Component({
  selector: 'app-domain-editor-form',
  standalone: true,
  templateUrl: './domain-editor-form.html',
  styleUrl: './domain-editor-form.scss',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TabsModule,
    Editor,
    InputTextModule,
    ButtonModule,
    ToggleSwitchModule,
    SelectModule,
    SelectButtonModule,
    PickListModule,
    MessageModule,
    CardModule,
  ],
})
export class DomainEditorFormComponent {
  readonly form = input.required<FormGroup>();
  readonly tabCodes = input<string[]>([]);
  readonly activeTab = input<string | undefined>(undefined);
  readonly langCodeOptions = input<LangOption[]>([]);
  readonly ownerOptions = input<UserOption[]>([]);
  readonly availableStaff = input<UserOption[]>([]);
  readonly selectedStaff = input<UserOption[]>([]);
  readonly translating = input(false);
  readonly submitError = input<string | null>(null);
  readonly ownerReadonly = input(false);
  readonly ownerPlaceholder = input('Choisir un owner');
  readonly submitLabel = input('Enregistrer');
  readonly titleLabel = input('Nom');

  readonly tabValueChange = output<string | number | undefined>();
  readonly translateClick = output<string>();
  readonly staffPickListChange = output<void>();
  readonly submitForm = output<void>();
  readonly cancel = output<void>();

  submit(): void {
    this.submitForm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onTabValueChange(value: string | number | undefined): void {
    this.tabValueChange.emit(value);
  }

  onTranslateClick(code: string): void {
    this.translateClick.emit(code);
  }

  onStaffChange(): void {
    this.staffPickListChange.emit();
  }

  langGroup(code: string): FormGroup {
    return this.form().get(['translations', code]) as FormGroup;
  }
}
