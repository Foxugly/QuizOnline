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
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';

import {DomainService, DomainTranslations} from '../../../services/domain/domain';
import {DomainEditApi} from '../../../services/domain/domain-edit-api';
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
import {DomainAnalyticsTab} from '../../../components/domain-analytics-tab/domain-analytics-tab';
import {DomainEditorFormComponent} from '../../../components/domain-editor-form/domain-editor-form';
import {DomainMembersTab} from '../../../components/domain-members-tab/domain-members-tab';

import {CustomUserReadDto} from '../../../api/generated/model/custom-user-read';
import {DomainAnalyticsDto} from '../../../api/generated/model/domain-analytics';
import {DomainDetailDto} from '../../../api/generated/model/domain-detail';
import {DomainAuditLogReadDto} from '../../../api/generated/model/domain-audit-log-read';
import {DomainInviteReadDto} from '../../../api/generated/model/domain-invite-read';
import {DomainInviteResultDto} from '../../../api/generated/model/domain-invite-result';
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
    DomainAnalyticsTab,
    DomainEditorFormComponent,
    DomainMembersTab,
  ],
  templateUrl: './domain-edit.html',
  styleUrl: './domain-edit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DomainEdit implements OnInit {
  readonly ui = inject(UiTextService).editor;
  id!: number;

  loading = signal(true);
  submitError = signal<string | null>(null);
  translating = signal(false);

  domain = signal<DomainDetailDto | null>(null);
  pendingRequests = signal<DomainJoinRequestReadDto[]>([]);
  topTab = signal<'config' | 'members' | 'audit' | 'analytics'>('config');
  readonly auditRows = signal<DomainAuditLogReadDto[]>([]);
  readonly auditLoading = signal<boolean>(false);

  readonly analytics = signal<DomainAnalyticsDto | null>(null);
  readonly analyticsLoading = signal<boolean>(false);

  // global languages (for selectButton options + code->id mapping)
  languages = signal<LanguageReadDto[]>([]);

  // users for owner/managers
  ownerOptions = signal<UserOption[]>([]);
  managersOptions = signal<UserOption[]>([]);
  availableManagers = signal<UserOption[]>([]);
  selectedManagers = signal<UserOption[]>([]);
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
  readonly pendingCount = computed(() => this.pendingRequests().length);

  readonly inviteResults = signal<DomainInviteResultDto[] | null>(null);
  readonly inviting = signal<boolean>(false);
  readonly invitations = signal<DomainInviteReadDto[]>([]);

  /** Other active domains the current user may invite to (owner OR
   *  manager), excluding the one being edited. Loaded once at init and
   *  passed to the members tab so the multi-domain invite multi-select
   *  has a list to render. */
  readonly additionalInvitableDomains = signal<{label: string; value: number}[]>([]);

  // Transfer-ownership dialog state.
  readonly transferDialogVisible = signal<boolean>(false);
  readonly transferTargetId = signal<number | null>(null);
  readonly transferring = signal<boolean>(false);
  readonly transferError = signal<string | null>(null);
  /** Candidates for the future-owner select: every known user except
   *  the current owner. The component already loads ``userService.list``
   *  into ``ownerOptions`` on init, so we just filter it. */
  readonly transferCandidates = computed(() => {
    const ownerId = this.domain()?.owner?.id;
    return this.ownerOptions().filter(o => o.value !== ownerId);
  });

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('id');
    const id = Number(rawId);
    if (!Number.isFinite(id)) {
      this.submitError.set(this.editText().errors.invalidId);
      this.loading.set(false);
      return;
    }
    this.id = id;
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
          this.loadPendingRequests();
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
          this.loadAnalytics();
        }

        // 2) Set global active languages
        const activeLangs = (languages ?? []).filter(l => l.active);
        this.languages.set(activeLangs);

        // 3) Build user options
        const opts: UserOption[] = (users ?? [])
          .filter(u => typeof u.id === 'number')
          .map(u => ({label: u.username, value: u.id}));

        this.ownerOptions.set(opts);
        this.managersOptions.set(opts);

        this.patchMetaFromDto(domain);
        this.recomputePickList();
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

    // Managers -> sync picklist if form.managers changes
    this.form.controls.managers.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recomputePickList());
  }

  onTopTabChange(value: string | number | undefined): void {
    if (
      value === 'members'
      || value === 'config'
      || value === 'audit'
      || value === 'analytics'
    ) {
      this.topTab.set(value);
      if (value === 'audit' && this.auditRows().length === 0) {
        this.loadAuditLog();
      }
      if (value === 'analytics' && this.analytics() === null) {
        this.loadAnalytics();
      }
    }
  }

  private loadAnalytics(): void {
    this.analyticsLoading.set(true);
    this.editApi.getAnalytics(this.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          logApiError('domain.edit.load-analytics', err);
          return of(null);
        }),
        finalize(() => this.analyticsLoading.set(false)),
      )
      .subscribe((data) => this.analytics.set(data));
  }

  private loadAuditLog(): void {
    this.auditLoading.set(true);
    this.editApi.listAudit(this.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          logApiError('domain.edit.load-audit', err);
          return of([] as DomainAuditLogReadDto[]);
        }),
        finalize(() => this.auditLoading.set(false)),
      )
      .subscribe((rows) => this.auditRows.set(rows));
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

  openTransferDialog(): void {
    this.transferTargetId.set(null);
    this.transferError.set(null);
    this.transferDialogVisible.set(true);
  }

  closeTransferDialog(): void {
    this.transferDialogVisible.set(false);
    this.transferTargetId.set(null);
    this.transferError.set(null);
  }

  submitTransfer(): void {
    const userId = this.transferTargetId();
    if (!userId || this.transferring()) {
      return;
    }
    this.transferring.set(true);
    this.transferError.set(null);
    this.editApi.proposeTransfer(this.id, userId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.transferring.set(false)),
      )
      .subscribe({
        next: () => {
          // Stay on the page; the proposal is sent but ownership has not
          // moved yet. Show a toast-like message and close.
          this.transferDialogVisible.set(false);
          this.submitError.set(this.editText().transfer.successMessage);
        },
        error: (err) => {
          logApiError('domain.edit.transfer', err);
          const detail = err?.error?.detail;
          const t = this.editText().transfer;
          switch (detail) {
            case 'already_owner':
              this.transferError.set(t.errorAlreadyOwner);
              return;
            case 'future_owner_unreachable':
              this.transferError.set(t.errorTargetUnreachable);
              return;
            default:
              this.transferError.set(t.errorGeneric);
          }
        },
      });
  }

  private loadPendingRequests(): void {
    this.editApi.listPendingJoinRequests(this.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          logApiError('domain.edit.load-pending-join-requests', err);
          return of([] as DomainJoinRequestReadDto[]);
        }),
      )
      .subscribe((rows) => this.pendingRequests.set(rows));
  }

  onTabValueChange(v: string | number | undefined): void {
    this.activeTab.set(v as LangCode | undefined);
  }

  langGroup(code: string): FormGroup {
    return getLocalizedTextGroup(this.translationsGroup(), code);
  }

  onManagersPickListChange(): void {
    const meId = this.userService.currentUser()?.id;

    const ids = this.selectedManagers().map(o => o.value);
    const fixedIds =
      typeof meId === 'number' && !ids.includes(meId) ? [...ids, meId] : ids;

    const current = this.form.controls.managers.value ?? [];
    const currentSet = new Set(current);
    const fixedSet = new Set(fixedIds);

    const same =
      currentSet.size === fixedSet.size &&
      [...currentSet].every(v => fixedSet.has(v));

    if (!same) {
      this.form.controls.managers.setValue(fixedIds);
      this.form.controls.managers.markAsDirty();
    }
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.goList(),
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

  private ensureMeInManagers(emitEvent: boolean): number | null {
    const meId = this.userService.currentUser()?.id;
    if (typeof meId !== 'number') return null;

    const current = this.form.controls.managers.value ?? [];
    if (!current.includes(meId)) {
      this.form.controls.managers.setValue([...current, meId], {emitEvent});
    }
    return meId;
  }

  private recomputePickList(): void {
    this.ensureMeInManagers(false);

    const all = this.managersOptions();
    const selectedIds = new Set(this.form.controls.managers.value ?? []);

    this.selectedManagers.set(all.filter(o => selectedIds.has(o.value)));
    this.availableManagers.set(all.filter(o => !selectedIds.has(o.value)));
  }
}
