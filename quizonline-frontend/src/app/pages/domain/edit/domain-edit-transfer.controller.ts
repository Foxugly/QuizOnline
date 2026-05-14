import {DestroyRef, Injectable, Signal, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {switchMap} from 'rxjs/operators';

import {DomainDetailDto} from '../../../api/generated/model/domain-detail';
import {DomainService} from '../../../services/domain/domain';
import {logApiError} from '../../../shared/api/api-errors';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {AppToastService} from '../../../shared/toast/app-toast.service';
import {getDomainEditUiText} from './domain-edit.i18n';

interface OwnerOption {
  label: string;
  value: number;
}

export interface DomainEditTransferBinding {
  domainId: number;
  /** Page-side accessor for the current domain DTO (owner id needed for filtering). */
  readDomain: () => DomainDetailDto | null;
  /** Available owner candidates — the page's existing ``ownerOptions`` signal. */
  readOwnerOptions: () => OwnerOption[];
  /** Hand-off after a successful transfer so the page can sync its form control + canEditOwner flag. */
  onTransferred: (dto: DomainDetailDto) => void;
}

/**
 * Transfer-ownership slice of /domain/{id}/edit. Owns the dialog
 * state and the submit flow, but defers form/owner-flag sync back to
 * the page via the ``onTransferred`` callback because those bits of
 * state belong to the main form, not the dialog.
 */
@Injectable()
export class DomainEditTransferController {
  private readonly domainService = inject(DomainService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(AppToastService);
  private readonly editText = inject(UiTextService).localized(getDomainEditUiText);

  readonly dialogVisible = signal(false);
  readonly targetId = signal<number | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  /** Candidates for the future-owner select: every known user except the current owner. */
  readonly candidates: Signal<OwnerOption[]> = computed(() => {
    const binding = this.binding;
    if (!binding) {
      return [];
    }
    const ownerId = binding.readDomain()?.owner?.id;
    return binding.readOwnerOptions().filter((o) => o.value !== ownerId);
  });

  private binding: DomainEditTransferBinding | null = null;

  bind(binding: DomainEditTransferBinding): void {
    this.binding = binding;
  }

  open(): void {
    this.targetId.set(null);
    this.error.set(null);
    this.dialogVisible.set(true);
  }

  close(): void {
    this.dialogVisible.set(false);
    this.targetId.set(null);
    this.error.set(null);
  }

  submit(): void {
    const binding = this.binding;
    if (!binding) {
      return;
    }
    const userId = this.targetId();
    if (!userId || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);

    this.domainService.updatePartial(binding.domainId, {owner: userId})
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => this.domainService.detail(binding.domainId)),
      )
      .subscribe({
        next: (dto) => {
          this.busy.set(false);
          binding.onTransferred(dto);
          this.dialogVisible.set(false);
          this.targetId.set(null);
          this.toast.add({
            severity: 'success',
            summary: this.editText().transfer.successMessage,
          });
        },
        error: (err) => {
          this.busy.set(false);
          logApiError('domain.edit.transfer', err);
          const detail = err?.error?.detail;
          const t = this.editText().transfer;
          this.error.set(detail === 'already_owner' ? t.errorAlreadyOwner : t.errorGeneric);
        },
      });
  }
}
