import {CommonModule} from '@angular/common';
import {Component, computed, inject, input, output, ChangeDetectionStrategy} from '@angular/core';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {FormGroup, ReactiveFormsModule} from '@angular/forms';

import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {EditorModule} from 'primeng/editor';
import {FieldsetModule} from 'primeng/fieldset';
import {InputTextModule} from 'primeng/inputtext';
import {MessageModule} from 'primeng/message';
import {SelectModule} from 'primeng/select';
import {SelectButtonModule} from 'primeng/selectbutton';
import {TabsModule} from 'primeng/tabs';
import {ToggleSwitchModule} from 'primeng/toggleswitch';
import {TooltipModule} from 'primeng/tooltip';

import {JoinPolicyEnumDto} from '../../api/generated/model/join-policy-enum';
import {SavedAtComponent} from '../../shared/components/saved-at/saved-at';

type UserOption = { label: string; value: number };
type LangOption = { label: string; value: string };
type JoinPolicyOption = { label: string; value: JoinPolicyEnumDto };

@Component({
  selector: 'app-domain-editor-form',
  templateUrl: './domain-editor-form.html',
  styleUrl: './domain-editor-form.scss',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TabsModule,
    EditorModule,
    FieldsetModule,
    InputTextModule,
    ButtonModule,
    ToggleSwitchModule,
    SelectModule,
    SelectButtonModule,
    MessageModule,
    CardModule,
    TooltipModule,
    SavedAtComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DomainEditorFormComponent {
  readonly form = input.required<FormGroup>();
  readonly tabCodes = input<string[]>([]);
  readonly activeTab = input<string | undefined>(undefined);
  readonly langCodeOptions = input<LangOption[]>([]);
  readonly ownerOptions = input<UserOption[]>([]);
  readonly translating = input(false);
  readonly submitError = input<string | null>(null);
  readonly ownerPlaceholder = input('');
  /** Render the internal "active" toggle in the configuration row. Set to
   *  false in /domain/{id}/edit where the toggle is hoisted into the page
   *  header (mirrors subject-edit / question-edit). Defaults to true so
   *  /domain/create keeps the inline toggle. */
  readonly showActiveToggle = input<boolean>(true);
  /** When true, the whole owner row is rendered (read-only). Set to false in
   *  /domain/create where the owner is implicitly the current user. */
  readonly showOwnerField = input(true);
  /** When true, an edit icon is rendered next to the read-only owner select.
   *  Reserved to the current owner / superuser in /domain/edit. */
  readonly showOwnerEditAction = input(false);
  readonly ownerEditTooltip = input('');
  readonly submitLabel = input('');
  readonly titleLabel = input('');
  readonly lastSavedAt = input<Date | null>(null);
  /** Render the certificate-branding section (per-language signatory
   *  title + signatory name + logo upload). Off in ``/domain/create``
   *  where the domain doesn't have an id yet, on in ``/domain/{id}/edit``. */
  readonly showCertificateBranding = input<boolean>(false);
  /** Current logo URL — drives the preview block. ``null`` when no
   *  logo is stored (or after the user clicked Remove). */
  readonly currentLogoUrl = input<string | null>(null);
  /** Newly-picked logo file (not yet uploaded). Drives the
   *  "selected file" badge under the file picker. */
  readonly certificateLogoFile = input<File | null>(null);
  readonly ui = inject(UiTextService).editor;

  readonly joinPolicyOptions = computed<JoinPolicyOption[]>(() => {
    const labels = this.ui().domainForm;
    return [
      {label: labels.joinPolicyAuto, value: JoinPolicyEnumDto.Auto},
      {label: labels.joinPolicyOwner, value: JoinPolicyEnumDto.Owner},
      {label: labels.joinPolicyOwnerManagers, value: JoinPolicyEnumDto.OwnerManagers},
    ];
  });

  readonly tabValueChange = output<string | number | undefined>();
  readonly translateClick = output<string>();
  readonly submitForm = output<void>();
  readonly cancel = output<void>();
  readonly editOwner = output<void>();
  /** Author picked a new logo file via the input element. The parent
   *  handles the staging + post-save multipart upload. */
  readonly certificateLogoSelected = output<Event>();
  /** Author clicked the "Remove logo" button next to the preview. */
  readonly certificateLogoRemoved = output<void>();
  /** Author clicked the "Clear selection" button on the staged file
   *  badge (drops the not-yet-uploaded file without touching the
   *  stored one). */
  readonly certificateLogoSelectionCleared = output<void>();

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

  onEditOwner(): void {
    this.editOwner.emit();
  }

  langGroup(code: string): FormGroup {
    return this.form().get(['translations', code]) as FormGroup;
  }

  onCertificateLogoSelected(event: Event): void {
    this.certificateLogoSelected.emit(event);
  }

  removeCurrentCertificateLogo(): void {
    this.certificateLogoRemoved.emit();
  }

  clearSelectedCertificateLogo(): void {
    this.certificateLogoSelectionCleared.emit();
  }
}
