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
import {TooltipModule} from 'primeng/tooltip';
import {FieldsetModule} from 'primeng/fieldset';
import {DatePickerModule} from 'primeng/datepicker';
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
import {AppToastService} from '../../../shared/toast/app-toast.service';
import {DomainAnalyticsTab} from '../../../components/domain-analytics-tab/domain-analytics-tab';
import {DomainEditorFormComponent} from '../../../components/domain-editor-form/domain-editor-form';
import {DomainInvitationsTab} from '../../../components/domain-invitations-tab/domain-invitations-tab';
import {DomainMembersTab} from '../../../components/domain-members-tab/domain-members-tab';
import {EmptyStateComponent} from '../../../shared/components/empty-state/empty-state';
import {LoadingSkeleton} from '../../../shared/components/loading-skeleton/loading-skeleton';
import {SavedAtComponent} from '../../../shared/components/saved-at/saved-at';
import {DirtyGuardDirective} from '../../../shared/directives/dirty-guard.directive';
import {runSave} from '../../../shared/forms/run-save';
import {DomainEditAuditController} from './domain-edit-audit.controller';
import {DomainEditAnalyticsController} from './domain-edit-analytics.controller';
import {DomainEditInvitationsController} from './domain-edit-invitations.controller';
import {DomainEditJoinRequestsController} from './domain-edit-join-requests.controller';
import {DomainEditNotificationsController} from './domain-edit-notifications.controller';
import {DomainEditTransferController} from './domain-edit-transfer.controller';
import {RelativeDatePipe} from '../../../shared/pipes/relative-date.pipe';

import {CustomUserReadDto} from '../../../api/generated/model/custom-user-read';
import {DomainDetailDto} from '../../../api/generated/model/domain-detail';
import {DomainWriteRequestDto} from '../../../api/generated/model/domain-write-request';
import {JoinPolicyEnumDto} from '../../../api/generated/model/join-policy-enum';
import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {LanguageReadDto} from '../../../api/generated/model/language-read';
import {UserSummaryDto} from '../../../api/generated/model/user-summary';
import {interp} from '../../../shared/i18n/format';
import {getDomainEditUiText} from './domain-edit.i18n';
import {labelForAction} from './domain-edit-action-label.util';

type UserOption = { label: string; value: number };
type DomainUserRef = UserSummaryDto;
type DomainWritePayload = DomainWriteRequestDto & {
  owner?: number;
  translations: DomainTranslations;
};

/** Per-language extra fields injected into the shared
 *  ``localized-text-form`` helpers so the Domain edit form carries
 *  ``certificate_signatory_title`` alongside ``name`` / ``description``
 *  on every language tab. Subject, which uses the same helpers, does
 *  not pass this — its translation groups keep their original shape. */
const DOMAIN_TRANSLATION_EXTRAS = ['certificate_signatory_title'] as const;


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
    TooltipModule,
    FieldsetModule,
    DatePickerModule,
    DomainAnalyticsTab,
    DomainEditorFormComponent,
    DomainInvitationsTab,
    DomainMembersTab,
    EmptyStateComponent,
    LoadingSkeleton,
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
    DomainEditInvitationsController,
    DomainEditJoinRequestsController,
    DomainEditNotificationsController,
    DomainEditTransferController,
  ],
})
export class DomainEdit implements OnInit {
  readonly ui = inject(UiTextService).editor;
  readonly adminUi = inject(UiTextService).ui;
  protected readonly audit = inject(DomainEditAuditController);
  protected readonly analytics = inject(DomainEditAnalyticsController);
  protected readonly invitations = inject(DomainEditInvitationsController);
  protected readonly joinRequestsCtrl = inject(DomainEditJoinRequestsController);
  protected readonly notifications = inject(DomainEditNotificationsController);
  protected readonly transfer = inject(DomainEditTransferController);
  id!: number;

  loading = signal(true);
  submitError = signal<string | null>(null);
  translating = signal(false);
  readonly lastSavedAt = signal<Date | null>(null);

  domain = signal<DomainDetailDto | null>(null);
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

    certificate_signatory_name: new FormControl<string>('', {nonNullable: true}),

    translations: this.fb.group({}) as FormGroup,
  });

  /** Newly-picked logo file (not yet uploaded). The save flow uploads
   *  it via :meth:`DomainService.uploadCertificateLogo` after the JSON
   *  PATCH succeeds — same two-step pattern the course-edit info tab
   *  uses for cover_image. */
  certificateLogoFile = signal<File | null>(null);
  /** Author explicitly cleared the current logo: send a
   *  ``{certificate_logo: null}`` PATCH so DRF wipes the storage even
   *  when no new file is picked. */
  certificateLogoCleared = signal(false);
  /** Visible URL of the logo in the preview block. ``null`` when the
   *  domain has no logo (or it was just cleared). */
  currentLogoUrl = computed<string | null>(() => {
    if (this.certificateLogoCleared()) {
      return null;
    }
    return this.domain()?.certificate_logo ?? null;
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
    this.invitations.bind({
      domainId: this.id,
      onError: (detail) => this.submitError.set(detail),
    });
    this.joinRequestsCtrl.bind({
      domainId: this.id,
      refreshDomain: () => this.refreshDomainSilently(),
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

        // join-requests + invitations are no longer fetched eagerly here:
        // ``onTopTabChange('invitations')`` triggers the load on first
        // visit, and ``ensureInvitationsLoaded()`` runs when the user
        // deep-links straight into that tab. Saves 3-4 HTTP round-trips
        // per /domain/<id>/edit visit when the operator is just editing
        // the config / languages / certificate branding.

        // Deep-link from /domain/list : ``?tab=analytics`` opens the
        // analytics tab directly. We only honour it once the domain is
        // loaded and the user actually has moderator rights, otherwise
        // the tab is hidden. ``onTopTabChange`` would also handle this
        // but we want the load to fire concurrently with the rest of
        // the domain bootstrap, not after Angular ticks the tab.
        const requestedTab = this.route.snapshot.queryParamMap.get('tab');
        if (requestedTab === 'analytics' && canMod) {
          this.topTab.set('analytics');
          this.analytics.load();
        } else if (requestedTab === 'invitations' && canMod) {
          this.topTab.set('invitations');
          this.ensureInvitationsLoaded();
        }

        // 2) Set global active languages
        const activeLangs = (languages ?? []).filter(l => l.active);
        this.languages.set(activeLangs);

        // 3) Build user options. Managers cannot list the owner via the
        // generic user endpoint, so make sure the readonly select still
        // resolves the owner's username by injecting it from the DTO.
        const opts: UserOption[] = (users ?? [])
          .filter(u => typeof u.id === 'number')
          .map(u => ({
            label: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || (u.email ?? ''),
            value: u.id,
          }));
        const ownerRef = domain.owner;
        if (ownerRef && typeof ownerRef.id === 'number'
          && !opts.some(o => o.value === ownerRef.id)) {
          opts.unshift({label: ownerRef.name ?? (ownerRef.email ?? ''), value: ownerRef.id});
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
      if (value === 'invitations') {
        this.ensureInvitationsLoaded();
      }
    }
  }

  readonly auditActionOptions = computed<Array<{label: string; value: string}>>(() => {
    const labels = this.editText().audit.actionLabels;
    return this.audit.actions().map((a) => ({label: labelForAction(a, labels), value: a}));
  });

  protected auditActionLabelText(action: string): string {
    return labelForAction(action, this.editText().audit.actionLabels);
  }

  protected transferPendingToText(username: string): string {
    return interp(this.editText().transfer.pendingTo, {username});
  }

  /** Idempotent first-load of the join-requests + invitations data the
   *  ``invitations`` tab consumes. Fires on first visit to that tab
   *  (and on a ``?tab=invitations`` deep-link) instead of eagerly on
   *  every /domain/<id>/edit visit. */
  private invitationsLoaded = false;
  private ensureInvitationsLoaded(): void {
    if (this.invitationsLoaded) return;
    this.invitationsLoaded = true;
    this.joinRequestsCtrl.load();
    this.invitations.loadAll();
  }

  /** Hand-off used by the join-requests controller after an approve/reject
   *  to keep the page's ``domain`` signal — and therefore the moderation
   *  badge, the members list, etc. — in sync. */
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

    // The certificate logo lives on a separate multipart endpoint
    // because DRF cannot decode binary in a JSON PATCH. The sequence:
    //   1. JSON PATCH for every other field (translations, signatory
    //      name, allowed languages, ...);
    //   2. if the author cleared the logo, send ``{certificate_logo: null}``;
    //   3. if the author picked a new file, multipart-PATCH it;
    //   4. refetch the domain detail so the page sees the canonical
    //      logo URL the backend stored.
    const logoFile = this.certificateLogoFile();
    const logoCleared = this.certificateLogoCleared() && !logoFile;
    this.domainService.update(this.id, payload)
      .pipe(
        switchMap(() => logoCleared
          ? this.domainService.clearCertificateLogo(this.id)
          : of(null),
        ),
        switchMap(() => logoFile
          ? this.domainService.uploadCertificateLogo(this.id, logoFile)
          : of(null),
        ),
        switchMap(() => this.domainService.detail(this.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (dto) => {
          this.domain.set(dto);
          this.lastSavedAt.set(new Date());
          this.form.markAsPristine();
          this.certificateLogoFile.set(null);
          this.certificateLogoCleared.set(false);
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
      certificate_signatory_name: dto.certificate_signatory_name ?? '',
    });
    // Reset the logo-edit signals each time we reseed from the DTO —
    // the file picker is per-edit-session and the "cleared" flag must
    // be False when the underlying value has just been refreshed.
    this.certificateLogoFile.set(null);
    this.certificateLogoCleared.set(false);
  }

  private syncTranslationControls(codes: string[]): void {
    const tg = this.translationsGroup();
    syncLocalizedTextControls(this.fb, tg, codes, {extraFields: DOMAIN_TRANSLATION_EXTRAS});

    // patch values from DTO for all wanted codes (stable, no emit)
    const dto = this.domain();
    if (dto) {
      const tr = (dto.translations ?? {}) as DomainTranslations;
      patchLocalizedTextRecord(tg, codes, tr, {extraFields: DOMAIN_TRANSLATION_EXTRAS});
    }
  }

  private buildPayload(): DomainWritePayload {
    const codes = this.form.controls.allowed_language_codes.value ?? [];
    const idMap = this.langIdByCode();
    const owner = this.form.controls.owner.value;

    const allowed_languages = codes
      .map(c => idMap[String(c)])
      .filter((id): id is number => typeof id === 'number');

    const translations = buildLocalizedTextRecord(
      this.translationsGroup(),
      undefined,
      {extraFields: DOMAIN_TRANSLATION_EXTRAS},
    ) as DomainTranslations;

    return {
      active: this.form.controls.active.value,
      public: this.form.controls.public.value,
      managers: this.form.controls.managers.value,
      join_policy: this.form.controls.join_policy.value,
      allowed_languages,
      translations,
      certificate_signatory_name: this.form.controls.certificate_signatory_name.value,
      ...(typeof owner === 'number' ? { owner } : {}),
    };
  }

  onCertificateLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file) {
      this.certificateLogoFile.set(file);
      this.certificateLogoCleared.set(false);
    }
    input.value = '';
  }

  removeCurrentCertificateLogo(): void {
    this.certificateLogoCleared.set(true);
    this.certificateLogoFile.set(null);
  }

  clearSelectedCertificateLogo(): void {
    this.certificateLogoFile.set(null);
  }

}
