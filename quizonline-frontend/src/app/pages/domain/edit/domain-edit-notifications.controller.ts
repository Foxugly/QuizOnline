import {DestroyRef, Injectable, inject, signal} from '@angular/core';
import {switchMap} from 'rxjs/operators';

import {DomainDetailDto} from '../../../api/generated/model/domain-detail';
import {DomainService} from '../../../services/domain/domain';
import {logApiError} from '../../../shared/api/api-errors';
import {runSave} from '../../../shared/forms/run-save';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {AppToastService} from '../../../shared/toast/app-toast.service';
import {getDomainEditUiText} from './domain-edit.i18n';

/**
 * Canonical kinds the domain owner can toggle on/off. Order drives
 * rendering order in the Notifications tab.
 */
export const DOMAIN_NOTIFICATION_KINDS = [
  'domain.join_request.created',
  'domain.join_request.decided',
  'domain.join_request.expiry_warning',
  'domain.invite.received',
  'domain.transfer.received',
  'quiz.assignment',
  'quiz.completed',
  'quiz.result_available',
  'quiz.detail_available',
] as const;

export interface DomainEditNotificationsBinding {
  domainId: number;
  /** Page-side accessor for the current domain DTO. */
  readDomain: () => DomainDetailDto | null;
  /** Hand-off after a successful save — the page mirrors the refreshed DTO into its own signal. */
  writeDomain: (dto: DomainDetailDto) => void;
  /** Optional ``lastSavedAt`` bump; called on each successful toggle. */
  bumpSavedAt: () => void;
}

/**
 * Notifications slice of /domain/{id}/edit. Owns the per-kind toggle
 * state derivation, the on/off mutation API call, and the post-save
 * refresh. Reads + writes the page's shared ``domain`` signal via the
 * callbacks passed to ``bind`` so the page-level state stays the single
 * source of truth.
 */
@Injectable()
export class DomainEditNotificationsController {
  readonly KINDS = DOMAIN_NOTIFICATION_KINDS;
  readonly saving = signal(false);

  private readonly domainService = inject(DomainService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(AppToastService);
  private readonly adminUi = inject(UiTextService).ui;
  private readonly editText = inject(UiTextService).localized(getDomainEditUiText);

  private binding: DomainEditNotificationsBinding | null = null;

  bind(binding: DomainEditNotificationsBinding): void {
    this.binding = binding;
  }

  isEnabled(kind: string): boolean {
    const dto = this.binding?.readDomain() ?? null;
    const settings = (dto?.notification_settings as Record<string, unknown> | null | undefined) ?? {};
    const value = settings[kind];
    if (value === false) {
      return false;
    }
    // Legacy per-channel blob: "off" only if both channels were False.
    if (value && typeof value === 'object') {
      const map = value as Record<string, unknown>;
      if (map['email'] === false && map['web'] === false) {
        return false;
      }
    }
    return true;
  }

  toggle(kind: string, enabled: boolean): void {
    const binding = this.binding;
    if (!binding) {
      return;
    }
    const dto = binding.readDomain();
    if (!dto) {
      return;
    }
    const current = (dto.notification_settings as Record<string, unknown> | null) ?? {};
    const next: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(current)) {
      if (v === false) {
        next[k] = false;
      } else if (v && typeof v === 'object') {
        const map = v as Record<string, unknown>;
        if (map['email'] === false && map['web'] === false) {
          next[k] = false;
        }
      }
    }
    if (enabled) {
      delete next[kind];
    } else {
      next[kind] = false;
    }

    const source = this.domainService
      .updatePartial(binding.domainId, {notification_settings: next} as unknown as {notification_settings: object})
      .pipe(switchMap(() => this.domainService.detail(binding.domainId)));

    runSave({
      saving: this.saving,
      destroyRef: this.destroyRef,
      toast: this.toast,
    }, source, {
      onSuccess: (detail) => {
        binding.writeDomain(detail);
        binding.bumpSavedAt();
      },
      errorDetail: this.editText().errors.saveFailed,
      onError: (err) => logApiError('domain.edit.notification-settings', err),
    });
  }

  /** Localised label for a kind — single source of truth shared with /preferences. */
  label(kind: string): string {
    const p = this.adminUi().preferences;
    switch (kind) {
      case 'domain.join_request.created':
        return p.notificationKindJoinRequestCreated;
      case 'domain.join_request.decided':
        return p.notificationKindJoinRequestDecided;
      case 'domain.join_request.expiry_warning':
        return p.notificationKindJoinRequestExpiry;
      case 'domain.invite.received':
        return p.notificationKindInviteReceived;
      case 'domain.transfer.received':
        return p.notificationKindTransferReceived;
      case 'quiz.assignment':
        return p.notificationKindQuizAssignment;
      case 'quiz.completed':
        return p.notificationKindQuizCompleted;
      case 'quiz.result_available':
        return p.notificationKindQuizResultAvailable;
      case 'quiz.detail_available':
        return p.notificationKindQuizDetailAvailable;
      default:
        return kind;
    }
  }
}
