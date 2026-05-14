import {Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {ActivatedRoute} from '@angular/router';
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

import {forkJoin, of} from 'rxjs';
import {catchError, finalize, switchMap} from 'rxjs/operators';

import {ButtonModule} from 'primeng/button';
import {TabsModule} from 'primeng/tabs';
import {BadgeModule} from 'primeng/badge';
import {DialogModule} from 'primeng/dialog';
import {SelectModule} from 'primeng/select';
import {MessageModule} from 'primeng/message';
import {TableModule} from 'primeng/table';
import {InputTextModule} from 'primeng/inputtext';
import {ToggleSwitchModule} from 'primeng/toggleswitch';
import {FieldsetModule} from 'primeng/fieldset';
import {DatePickerModule} from 'primeng/datepicker';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';

import {DomainService, DomainTranslations} from '../../../services/domain/domain';
import {DomainEditApi, JoinRequestStatusFilter} from '../../../services/domain/domain-edit-api';
import {UserService} from '../../../services/user/user';
import {LanguageService} from '../../../services/language/language';
import {isLangCode, LangCode, TranslationService} from '../../../services/translation/translation';
import {
  buildLocalizedTextRecord,
  getLocalizedTextGroup,
  patchLocalizedTextRecord,
  syncLocalizedTextControls,
} from '../../../shared/forms/localized-text-form';
import {logApiError, userFacingApiMessage} from '../../../shared/api/api-errors';
import {isEmptyRichText} from '../../../shared/html/is-empty-rich-text';
import {AppToastService} from '../../../shared/toast/app-toast.service';
import {DomainAnalyticsTab} from '../../../components/domain-analytics-tab/domain-analytics-tab';
import {DomainEditorFormComponent} from '../../../components/domain-editor-form/domain-editor-form';
import {DomainInvitationsTab} from '../../../components/domain-invitations-tab/domain-invitations-tab';
import {DomainMembersTab} from '../../../components/domain-members-tab/domain-members-tab';
import {EmptyStateComponent} from '../../../shared/components/empty-state/empty-state';
import {SavedAtComponent} from '../../../shared/components/saved-at/saved-at';
import {DirtyGuardDirective} from '../../../shared/directives/dirty-guard.directive';
import {runSave} from '../../../shared/forms/run-save';
import {DomainEditAuditController} from './domain-edit-audit.controller';
import {DomainEditAnalyticsController} from './domain-edit-analytics.controller';
import {DomainEditNotificationsController} from './domain-edit-notifications.controller';
import {DomainEditTransferController} from './domain-edit-transfer.controller';
import {RelativeDatePipe} from '../../../shared/pipes/relative-date.pipe';

import {CustomUserReadDto} from '../../../api/generated/model/custom-user-read';
import {DomainDetailDto} from '../../../api/generated/model/domain-detail';
import {DomainInviteReadDto} from '../../../api/generated/model/domain-invite-read';
import {DomainInviteResultDto} from '../../../api/generated/model/domain-invite-result';
import {DomainJoinRequestBulkResultDto} from '../../../api/generated/model/domain-join-request-bulk-result';
import {DomainJoinRequestReadDto} from '../../../api/generated/model/domain-join-request-read';
import {DomainWriteRequestDto} from '../../../api/generated/model/domain-write-request';
import {JoinPolicyEnumDto} from '../../../api/generated/model/join-policy-enum';
import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {LanguageReadDto} from '../../../api/generated/model/language-read';
import {UserSummaryDto} from '../../../api/generated/model/user-summary';
import {getDomainEditUiText} from './domain-edit.i18n';

type UserOption = { label: string; value: number };
type DomainUserRef = UserSummaryDto;
type DomainWritePayload = DomainWriteRequestDto & {
  owner?: number;
  translations: DomainTranslations;
};


function asNumber(x: unknown): number | null {
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
}

function getUserId(userRef: DomainUserRef | null | undefined): number | null {
  return asNumber(userRef?.id);
}

@Component({
  selector: 'app-domain-edit',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    DatePipe,
    ButtonModule,
    TabsModule,
    BadgeModule,
    DialogModule,
    SelectModule,
    MessageModule,
    TableModule,
    InputTextModule,
    ToggleSwitchModule,
    FieldsetModule,
    DatePickerModule,
    DomainAnalyticsTab,
    DomainEditorFormComponent,
    DomainInvitationsTab,
    DomainMembersTab,
    EmptyStateComponent,
    RelativeDatePipe,
    DirtyGuardDirective,
    SavedAtComponent,
  ],
  templateUrl: './domain-edit.html',
  styleUrl: './domain-edit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    DomainEditAuditController,
    DomainEditAnalyticsController,
    DomainEditNotificationsController,
    DomainEditTransferController,
  ],
})
export class DomainEdit implements OnInit {
  readonly ui = inject(UiTextService).editor;
  readonly adminUi = inject(UiTextService).ui;
  protected readonly audit = inject(DomainEditAuditController);
  protected readonly analytics = inject(DomainEditAnalyticsController);
  protected readonly notifications = inject(DomainEditNotificationsController);
  protected readonly transfer = inject(DomainEditTransferController);
  id!: number;

  loading = signal(true);
  submitError = signal<string | null>(null);
  translating = signal(false);
  readonly lastSavedAt = signal<Date | null>(null);

  domain = signal<DomainDetailDto | null>(null);
  joinRequests = signal<DomainJoinRequestReadDto[]>([]);
  joinRequestsLoading = signal<boolean>(false);
  joinRequestStatusFilter = signal<JoinRequestStatusFilter>('pending');
  applyingBulk = signal<boolean>(false);
  topTab = signal<'config' | 'notifications' | 'members' | 'invitations' | 'audit' | 'analytics'>('config');

  // global languages (for selectButton options + code->id mapping)
  languages = signal<LanguageReadDto[]>([]);

  // users for owner picker
  ownerOptions = signal<UserOption[]>([]);
  canEditOwner = signal(false);

  // tabs (code-based)
  tabCodes = signal<LangCode[]>([]);
  activeTab = signal<LangCode | undefined>(undefined);
  // options for selectButton
  langCodeOptions = computed<Array<{ label: string; value: LangCode }>>(() => {
    return (this.languages() ?? [])
      .filter(l => l.active)
      .map(l => {
        const code = String(l.code) as LangCode;
        return {
          label: l.name || code.toUpperCase(),
          value: code,
        };
      })
      .filter(o => isLangCode(o.value));
  });
  // code -> id (for allowed_languages payload)
  langIdByCode = computed<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const l of this.languages()) {
      if (typeof l.code === 'string' && typeof l.id === 'number') {
        map[l.code] = l.id;
      }
    }
    return map;
  });
  private prevCodes = new Set<LangCode>();
  private fb = inject(FormBuilder);
  form = this.fb.group({
    active: new FormControl<boolean>(true, {nonNullable: true}),
    public: new FormControl<boolean>(true, {nonNullable: true}),
    owner: new FormControl<number | null>(null),
    managers: new FormControl<number[]>([], {nonNullable: true}),
    join_policy: new FormControl<JoinPolicyEnumDto>(JoinPolicyEnumDto.Auto, {nonNullable: true}),

    allowed_language_codes: new FormControl<LangCode[]>([], {
      nonNullable: true,
      validators: [Validators.required],
    }),

    translations: this.fb.group({}) as FormGroup,
  });
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  private domainService = inject(DomainService);
  private userService = inject(UserService);
  currentLang = computed(() => this.userService.currentLang);
  private languageService = inject(LanguageService);
  private translator = inject(TranslationService);
  private editApi = inject(DomainEditApi);
  private toast = inject(AppToastService);

  readonly editText = inject(UiTextService).localized(getDomainEditUiText);
  readonly currentUserId = computed(() => this.userService.currentUser()?.id ?? null);
  readonly canModerate = computed(() => {
    const dto = this.domain();
    const me = this.userService.currentUser();
    if (!dto || !me) {
      return false;
    }
    if (me.is_superuser) {
      return true;
    }
    if (dto.owner?.id === me.id) {
      return true;
    }
    return (dto.managers ?? []).some(m => m.id === me.id);
  });
  /** Owner-only (or superuser) gate for role changes / member removal in the
   *  Members tab. Matches the backend rule introduced in this same change. */
  readonly canManageMembers = computed(() => {
    const dto = this.domain();
    const me = this.userService.currentUser();
    if (!dto || !me) {
      return false;
    }
    return !!me.is_superuser || dto.owner?.id === me.id;
  });
  /** Owner OR manager (or superuser) — both can send invitations. */
  readonly canInvite = computed(() => {
    const dto = this.domain();
    const me = this.userService.currentUser();
    if (!dto || !me) {
      return false;
    }
    if (me.is_superuser || dto.owner?.id === me.id) {
      return true;
    }
    return (dto.managers ?? []).some(m => m.id === me.id);
  });
  readonly pendingCount = computed(
    () => this.joinRequests().filter((r) => r.status === 'pending').length,
  );

  readonly inviteResults = signal<DomainInviteResultDto[] | null>(null);
  readonly inviting = signal<boolean>(false);
  readonly invitations = signal<DomainInviteReadDto[]>([]);

  /** Other active domains the current user may invite to (owner OR
   *  manager), excluding the one being edited. Loaded once at init and
   *  passed to the members tab so the multi-domain invite multi-select
   *  has a list to render. */
  readonly additionalInvitableDomains = signal<{label: string; value: number}[]>([]);


  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('id');
    const id = Number(rawId);
    if (!Number.isFinite(id)) {
      this.submitError.set(this.editText().errors.invalidId);
      this.loading.set(false);
      return;
    }
    this.id = id;
    this.audit.bind(this.id);
    this.analytics.bind(this.id);
    this.notifications.bind({
      domainId: this.id,
      readDomain: () => this.domain(),
      writeDomain: (dto) => this.domain.set(dto),
      bumpSavedAt: () => this.lastSavedAt.set(new Date()),
    });
    this.transfer.bind({
      domainId: this.id,
      readDomain: () => this.domain(),
      readOwnerOptions: () => this.ownerOptions(),
      onTransferred: (dto) => this.onOwnerTransferred(dto),
    });
    this.loading.set(true);
    this.submitError.set(null);

    // 1) Load all: domain + users + languages (each with its own catchError)
    forkJoin({
      domain: this.domainService.detail(this.id).pipe(
        catchError((err) => {
          logApiError('domain.edit.load-domain', err);
          return of(null as DomainDetailDto | null);
        }),
      ),
      users: this.userService.list().pipe(
        catchError((err) => {
          logApiError('domain.edit.load-users', err);
          return of([] as CustomUserReadDto[]);
        }),
      ),
      languages: this.languageService.list().pipe(
        catchError((err) => {
          logApiError('domain.edit.load-languages', err);
          return of([] as LanguageReadDto[]);
        }),
      ),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe(({domain, users, languages}) => {
        if (!domain) {
          this.submitError.set(this.editText().errors.loadDomainFailed);
          return;
        }

        this.domain.set(domain);
        const me = this.userService.currentUser();
        this.canEditOwner.set(
          !!me && (me.is_superuser || domain.owner?.id === me.id),
        );

        const canMod =
          !!me && (me.is_superuser
            || domain.owner?.id === me.id
            || (domain.managers ?? []).some(m => m.id === me.id));
        if (canMod) {
          this.loadJoinRequests();
          this.loadInvitations();
          this.loadAdditionalInvitableDomains();
        }

        // Deep-link from /domain/list : ``?tab=analytics`` opens the
        // analytics tab directly. We only honour it once the domain is
        // loaded and the user actually has moderator rights, otherwise
        // the tab is hidden.
        const requestedTab = this.route.snapshot.queryParamMap.get('tab');
        if (requestedTab === 'analytics' && canMod) {
          this.topTab.set('analytics');
          this.analytics.load();
        }

        // 2) Set global active languages
        const activeLangs = (languages ?? []).filter(l => l.active);
        this.languages.set(activeLangs);

        // 3) Build user options. Managers cannot list the owner via the
        // generic user endpoint, so make sure the readonly select still
        // resolves the owner's username by injecting it from the DTO.
        const opts: UserOption[] = (users ?? [])
          .filter(u => typeof u.id === 'number')
          .map(u => ({label: u.username, value: u.id}));
        const ownerRef = domain.owner;
        if (ownerRef && typeof ownerRef.id === 'number'
          && !opts.some(o => o.value === ownerRef.id)) {
          opts.unshift({label: ownerRef.username, value: ownerRef.id});
        }

        this.ownerOptions.set(opts);

        this.patchMetaFromDto(domain);
        const activeSet = new Set(activeLangs.map(l => String(l.code)));
        const initialCodes = Array.from(new Set(
          (domain.allowed_languages ?? [])
            .map(l => l.code)
            .filter(isLangCode)
            .filter(c => activeSet.has(c))
        ));
        if (!initialCodes.length) {
          this.activeTab.set(undefined);
          return;
        }
        this.form.controls.allowed_language_codes.setValue(initialCodes, {emitEvent: false});
        this.tabCodes.set(initialCodes);
        this.syncTranslationControls(initialCodes.map(String));
        this.prevCodes = new Set(initialCodes);
        const pref = this.currentLang();
        const prefCode = typeof pref === 'string' && isLangCode(pref) ? pref : undefined;
        this.activeTab.set(
          (prefCode && initialCodes.includes(prefCode) ? prefCode : initialCodes[0]) ?? undefined
        );
      });

    // 2) User-driven changes only (tabs + controls + activeTab rules)
    this.form.controls.allowed_language_codes.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((codes) => {
        const next = (codes ?? []).filter(isLangCode);
        // update UI + controls
        this.tabCodes.set(next);
        this.syncTranslationControls(next.map(String));

        // active tab rules
        const current = this.activeTab();
        const added = next.find(c => !this.prevCodes.has(c));
        const removedActive = !!current && !next.includes(current);

        if (!current && added) {
          this.activeTab.set(added);
        } else if (removedActive) {
          this.activeTab.set(next.length ? next[0] : undefined);
        } else if (!next.length) {
          this.activeTab.set(undefined);
        }

        this.prevCodes = new Set(next);
      });

  }

  onTopTabChange(value: string | number | undefined): void {
    if (
      value === 'members'
      || value === 'config'
      || value === 'notifications'
      || value === 'invitations'
      || value === 'audit'
      || value === 'analytics'
    ) {
      this.topTab.set(value);
      if (value === 'audit') {
        this.audit.ensureLoaded();
      }
      if (value === 'analytics' && this.analytics.data() === null) {
        this.analytics.load();
      }
    }
  }

  readonly auditActionOptions = computed<Array<{label: string; value: string}>>(() => {
    const labelFn = this.editText().audit.actionLabel;
    return this.audit.actions().map((a) => ({label: labelFn(a), value: a}));
  });

  onJoinRequestStatusFilterChange(value: JoinRequestStatusFilter): void {
    this.joinRequestStatusFilter.set(value);
    this.loadJoinRequests();
  }

  onJoinRequestApprove(evt: {requestId: number}): void {
    this.editApi.approveJoinRequest(this.id, evt.requestId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadJoinRequests();
          this.refreshDomainSilently();
        },
        error: (err) => {
          logApiError('domain.edit.join-request-approve', err);
          this.toast.addApiError(err, this.editText().members.actionFailed);
        },
      });
  }

  onJoinRequestReject(evt: {requestId: number; reason: string}): void {
    this.editApi.rejectJoinRequest(this.id, evt.requestId, evt.reason)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadJoinRequests();
          this.refreshDomainSilently();
        },
        error: (err) => {
          logApiError('domain.edit.join-request-reject', err);
          this.toast.addApiError(err, this.editText().members.actionFailed);
        },
      });
  }

  onJoinRequestBulkApprove(evt: {requestIds: number[]}): void {
    if (!evt.requestIds.length || this.applyingBulk()) {
      return;
    }
    this.applyingBulk.set(true);
    this.editApi.bulkApproveJoinRequests(this.id, evt.requestIds)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.applyingBulk.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.notifyBulkResult(result);
          this.loadJoinRequests();
          this.refreshDomainSilently();
        },
        error: (err) => {
          logApiError('domain.edit.join-request-bulk-approve', err);
          this.toast.addApiError(err, this.editText().members.actionFailed);
        },
      });
  }

  onJoinRequestBulkReject(evt: {requestIds: number[]; reason: string}): void {
    if (!evt.requestIds.length || this.applyingBulk()) {
      return;
    }
    this.applyingBulk.set(true);
    this.editApi.bulkRejectJoinRequests(this.id, evt.requestIds, evt.reason)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.applyingBulk.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.notifyBulkResult(result);
          this.loadJoinRequests();
          this.refreshDomainSilently();
        },
        error: (err) => {
          logApiError('domain.edit.join-request-bulk-reject', err);
          this.toast.addApiError(err, this.editText().members.actionFailed);
        },
      });
  }

  private notifyBulkResult(result: DomainJoinRequestBulkResultDto): void {
    const labels = this.adminUi().admin.joinRequests;
    this.toast.add({
      severity: result.skipped > 0 ? 'warn' : 'success',
      summary: labels.bulkResultTitle,
      detail: labels.bulkResultDetail(result.processed, result.skipped),
    });
  }

  private refreshDomainSilently(): void {
    this.domainService.detail(this.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          logApiError('domain.edit.refresh-domain', err);
          return of(null as DomainDetailDto | null);
        }),
      )
      .subscribe((dto) => {
        if (dto) {
          this.domain.set(dto);
        }
      });
  }

  onMemberRoleChange(evt: {userId: number; makeManager: boolean}): void {
    this.editApi.changeMemberRole(this.id, evt.userId, evt.makeManager)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => this.domainService.detail(this.id)),
      )
      .subscribe({
        next: (dto) => this.domain.set(dto),
        error: (err) => {
          logApiError('domain.edit.member-role', err);
          this.submitError.set(this.editText().members.actionFailed);
        },
      });
  }

  onInviteRequest(evt: {emails: string[]; additionalDomainIds: number[]}): void {
    if (!evt.emails.length || this.inviting()) {
      return;
    }
    this.inviting.set(true);
    this.inviteResults.set(null);
    const language = this.userService.currentLang ?? LanguageEnumDto.Fr;
    this.editApi.sendInvites(this.id, evt.emails, language, evt.additionalDomainIds)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.inviting.set(false)),
      )
      .subscribe({
        next: (results) => {
          this.inviteResults.set(results);
          // Refresh the pending-invitations table so the new rows
          // surface immediately under the members tab.
          this.loadInvitations();
        },
        error: (err) => {
          logApiError('domain.edit.invite', err);
          this.submitError.set(this.editText().members.actionFailed);
        },
      });
  }

  onInviteResend(evt: {inviteId: number}): void {
    this.editApi.resendInvitation(this.id, evt.inviteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadInvitations(),
        error: (err) => {
          logApiError('domain.edit.invite-resend', err);
          this.submitError.set(this.editText().members.actionFailed);
        },
      });
  }

  onInviteRevoke(evt: {inviteId: number}): void {
    this.editApi.revokeInvitation(this.id, evt.inviteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadInvitations(),
        error: (err) => {
          logApiError('domain.edit.invite-revoke', err);
          this.submitError.set(this.editText().members.actionFailed);
        },
      });
  }

  private loadInvitations(): void {
    this.editApi.listInvitations(this.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          logApiError('domain.edit.load-invitations', err);
          return of([] as DomainInviteReadDto[]);
        }),
      )
      .subscribe((rows) => this.invitations.set(rows));
  }

  private loadAdditionalInvitableDomains(): void {
    // Multi-domain invite: build the picker list once at init from the
    // domains visible to the user (``DomainService.list``) and keep
    // only those the user can actually invite to (owner OR manager),
    // excluding the one currently being edited.
    //
    // The list is loaded once on ngOnInit and never refreshed during
    // the page lifetime, so a manager added or removed elsewhere in
    // the system between page-load and dialog-open will not surface
    // until a full reload. This is acceptable because the server-side
    // ``invite`` action re-screens every target id and returns
    // ``forbidden_domain`` for any unauthorised pick; the worst case
    // is one wasted HTTP round-trip, not a privilege bypass.
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
            if (d.id === this.id) {
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
          .map((d) => {
            const tr = d.translations ?? {};
            const entry = tr[lang] ?? tr['fr'] ?? tr['en'] ?? Object.values(tr)[0];
            const name = entry?.name?.trim() || `Domain #${d.id}`;
            return {label: name, value: d.id};
          })
          .sort((a, b) => a.label.localeCompare(b.label));
        this.additionalInvitableDomains.set(options);
      });
  }

  onMemberRemove(evt: {userId: number}): void {
    this.editApi.removeMember(this.id, evt.userId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => this.domainService.detail(this.id)),
      )
      .subscribe({
        next: (dto) => this.domain.set(dto),
        error: (err) => {
          logApiError('domain.edit.member-remove', err);
          this.submitError.set(this.editText().members.actionFailed);
        },
      });
  }

  /** Hand-off used by ``DomainEditTransferController`` after a successful
   * ownership transfer: mirror the refreshed DTO and recompute the local
   * "can edit owner" flag (the previous owner may have just demoted
   * themselves and must lose the edit icon on the next render). */
  private onOwnerTransferred(dto: DomainDetailDto): void {
    this.domain.set(dto);
    this.form.controls.owner.setValue(dto.owner?.id ?? null, {emitEvent: false});
    const me = this.userService.currentUser();
    this.canEditOwner.set(!!me && (me.is_superuser || dto.owner?.id === me.id));
  }

  private loadJoinRequests(): void {
    this.joinRequestsLoading.set(true);
    this.editApi.listJoinRequests(this.id, this.joinRequestStatusFilter())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          logApiError('domain.edit.load-join-requests', err);
          return of([] as DomainJoinRequestReadDto[]);
        }),
        finalize(() => this.joinRequestsLoading.set(false)),
      )
      .subscribe((rows) => this.joinRequests.set(rows));
  }

  onTabValueChange(v: string | number | undefined): void {
    this.activeTab.set(v as LangCode | undefined);
  }

  langGroup(code: string): FormGroup {
    return getLocalizedTextGroup(this.translationsGroup(), code);
  }

  save(): void {
    this.submitError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError.set(this.editText().errors.formInvalid);
      return;
    }

    const payload = this.buildPayload();

    if (!payload.allowed_languages?.length) {
      this.submitError.set(this.editText().errors.needOneLanguage);
      return;
    }

    this.domainService.update(this.id, payload)
      .pipe(
        switchMap(() => this.domainService.detail(this.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (dto) => {
          this.domain.set(dto);
          this.lastSavedAt.set(new Date());
          this.form.markAsPristine();
        },
        error: (err) => {
          logApiError('domain.edit.submit', err);
          this.submitError.set(userFacingApiMessage(err, this.editText().errors.saveFailed));
        },
      });
  }

  goList(): void {
    this.domainService.goList();
  }

  async translateFrom(sourceLang: string): Promise<void> {
    const codes = Object.keys(this.translationsGroup().controls);
    if (!codes.includes(sourceLang)) return;

    this.translating.set(true);
    this.submitError.set(null);

    try {
      const source = this.langGroup(sourceLang);
      const sourceName = (source.get('name') as FormControl<string>).value ?? '';
      const sourceDesc = (source.get('description') as FormControl<string>).value ?? '';

      for (const targetLang of codes) {
        if (targetLang === sourceLang) continue;

        const target = this.langGroup(targetLang);
        const nameCtrl = target.get('name') as FormControl<string>;
        const descCtrl = target.get('description') as FormControl<string>;

        const needName = !(nameCtrl.value ?? '').trim();
        const needDesc = isEmptyRichText(descCtrl.value ?? '');

        const items: Array<{ key: string; text: string; format: 'text' | 'html' }> = [];
        if (needName) items.push({key: 'name', text: sourceName, format: 'text'});
        if (needDesc) items.push({key: 'description', text: sourceDesc, format: 'html'});

        if (!items.length) continue;

        const out = await this.translator.translateBatch(sourceLang, targetLang, items);

        if (needName && out['name'] !== undefined) nameCtrl.setValue(out['name']);
        if (needDesc && out['description'] !== undefined) descCtrl.setValue(out['description']);
      }
    } catch (e) {
      logApiError('domain.edit.translate', e);
      this.submitError.set(userFacingApiMessage(e, this.editText().errors.translationFailed));
    } finally {
      this.translating.set(false);
    }
  }

  // --- helpers ---
  private translationsGroup(): FormGroup {
    return this.form.get('translations') as FormGroup;
  }

  private patchMetaFromDto(dto: DomainDetailDto): void {
    const ownerId = getUserId(dto.owner);

    const managerIds = (dto.managers ?? [])
      .map((userRef) => getUserId(userRef))
      .filter((id): id is number => id !== null);

    this.form.patchValue({
      active: dto.active ?? true,
      public: dto.public ?? true,
      owner: ownerId,
      managers: managerIds,
      join_policy: (dto.join_policy as JoinPolicyEnumDto | undefined) ?? JoinPolicyEnumDto.Auto,
    });
  }

  private syncTranslationControls(codes: string[]): void {
    const tg = this.translationsGroup();
    syncLocalizedTextControls(this.fb, tg, codes);

    // patch values from DTO for all wanted codes (stable, no emit)
    const dto = this.domain();
    if (dto) {
      const tr = (dto.translations ?? {}) as DomainTranslations;
      patchLocalizedTextRecord(tg, codes, tr);
    }
  }

  private buildPayload(): DomainWritePayload {
    const codes = this.form.controls.allowed_language_codes.value ?? [];
    const idMap = this.langIdByCode();
    const owner = this.form.controls.owner.value;

    const allowed_languages = codes
      .map(c => idMap[String(c)])
      .filter((id): id is number => typeof id === 'number');

    const translations = buildLocalizedTextRecord(this.translationsGroup()) as DomainTranslations;

    return {
      active: this.form.controls.active.value,
      public: this.form.controls.public.value,
      managers: this.form.controls.managers.value,
      join_policy: this.form.controls.join_policy.value,
      allowed_languages,
      translations,
      ...(typeof owner === 'number' ? { owner } : {}),
    };
  }

}
