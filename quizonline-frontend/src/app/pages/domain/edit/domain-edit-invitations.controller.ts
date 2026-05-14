import {DestroyRef, Injectable, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {of} from 'rxjs';
import {catchError, finalize} from 'rxjs/operators';

import {DomainInviteReadDto} from '../../../api/generated/model/domain-invite-read';
import {DomainInviteResultDto} from '../../../api/generated/model/domain-invite-result';
import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {DomainService} from '../../../services/domain/domain';
import {DomainEditApi} from '../../../services/domain/domain-edit-api';
import {UserService} from '../../../services/user/user';
import {logApiError} from '../../../shared/api/api-errors';
import {getLocalizedDomainName} from '../../../shared/i18n/domain-label';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {getDomainEditUiText} from './domain-edit.i18n';

export interface DomainEditInvitationsBinding {
  domainId: number;
  /** Hand-off so the page can surface an error string in its own ``submitError`` signal. */
  onError: (detail: string) => void;
}

/**
 * Invitations slice of /domain/{id}/edit. Owns the pending invitations
 * table, the send-result rows surfaced after a multi-domain invite,
 * and the picker list for the multi-domain invite multi-select.
 *
 * Errors are reported back via ``onError`` so the page can set its
 * top-level ``submitError`` banner — invitations don't have their own
 * dialog footer to host an inline error.
 */
@Injectable()
export class DomainEditInvitationsController {
  private readonly editApi = inject(DomainEditApi);
  private readonly domainService = inject(DomainService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly userService = inject(UserService);
  private readonly editText = inject(UiTextService).localized(getDomainEditUiText);

  readonly results = signal<DomainInviteResultDto[] | null>(null);
  readonly sending = signal(false);
  readonly invitations = signal<DomainInviteReadDto[]>([]);

  /** Other active domains the current user may invite to (owner OR
   * manager), excluding the one being edited. Loaded once at init. */
  readonly additionalInvitableDomains = signal<{label: string; value: number}[]>([]);

  private binding: DomainEditInvitationsBinding | null = null;

  bind(binding: DomainEditInvitationsBinding): void {
    this.binding = binding;
  }

  loadAll(): void {
    this.loadInvitations();
    this.loadAdditionalInvitableDomains();
  }

  onInviteRequest(evt: {emails: string[]; additionalDomainIds: number[]}): void {
    const binding = this.binding;
    if (!binding || !evt.emails.length || this.sending()) {
      return;
    }
    this.sending.set(true);
    this.results.set(null);
    const language = this.userService.currentLang ?? LanguageEnumDto.Fr;
    this.editApi.sendInvites(binding.domainId, evt.emails, language, evt.additionalDomainIds)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.sending.set(false)),
      )
      .subscribe({
        next: (results) => {
          this.results.set(results);
          // Refresh the pending-invitations table so new rows surface
          // immediately under the members tab.
          this.loadInvitations();
        },
        error: (err) => {
          logApiError('domain.edit.invite', err);
          binding.onError(this.editText().members.actionFailed);
        },
      });
  }

  onInviteResend(evt: {inviteId: number}): void {
    const binding = this.binding;
    if (!binding) {
      return;
    }
    this.editApi.resendInvitation(binding.domainId, evt.inviteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadInvitations(),
        error: (err) => {
          logApiError('domain.edit.invite-resend', err);
          binding.onError(this.editText().members.actionFailed);
        },
      });
  }

  onInviteRevoke(evt: {inviteId: number}): void {
    const binding = this.binding;
    if (!binding) {
      return;
    }
    this.editApi.revokeInvitation(binding.domainId, evt.inviteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadInvitations(),
        error: (err) => {
          logApiError('domain.edit.invite-revoke', err);
          binding.onError(this.editText().members.actionFailed);
        },
      });
  }

  private loadInvitations(): void {
    if (!this.binding) {
      return;
    }
    this.editApi.listInvitations(this.binding.domainId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          logApiError('domain.edit.load-invitations', err);
          return of([] as DomainInviteReadDto[]);
        }),
      )
      .subscribe((rows) => this.invitations.set(rows));
  }

  /**
   * Multi-domain invite: build the picker list once from the domains
   * visible to the user (``DomainService.list``) and keep only those
   * the user can actually invite to (owner OR manager), excluding the
   * one currently being edited.
   *
   * The list is loaded once at init and never refreshed during the
   * page lifetime, so a manager added or removed elsewhere in the
   * system between page-load and dialog-open will not surface until a
   * full reload. This is acceptable because the server-side ``invite``
   * action re-screens every target id and returns ``forbidden_domain``
   * for any unauthorised pick; the worst case is one wasted HTTP
   * round-trip, not a privilege bypass.
   */
  private loadAdditionalInvitableDomains(): void {
    const binding = this.binding;
    if (!binding) {
      return;
    }
    this.domainService.list()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          logApiError('domain.edit.load-invitable-domains', err);
          return of([]);
        }),
      )
      .subscribe((domains) => {
        const me = this.userService.currentUser();
        if (!me) {
          this.additionalInvitableDomains.set([]);
          return;
        }
        const lang = this.userService.currentLang;
        const options = (domains ?? [])
          .filter((d) => {
            if (d.id === binding.domainId) {
              return false;
            }
            if (d.active === false) {
              return false;
            }
            if (me.is_superuser || d.owner?.id === me.id) {
              return true;
            }
            return (d.managers ?? []).some((m) => m.id === me.id);
          })
          .map((d) => ({label: getLocalizedDomainName(d, lang), value: d.id}))
          .sort((a, b) => a.label.localeCompare(b.label));
        this.additionalInvitableDomains.set(options);
      });
  }
}
