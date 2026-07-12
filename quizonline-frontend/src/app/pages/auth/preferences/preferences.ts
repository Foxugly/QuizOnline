import {CommonModule} from '@angular/common';
import {Component, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormBuilder, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {finalize, forkJoin, Observable, of} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {DialogModule} from 'primeng/dialog';
import {FieldsetModule} from 'primeng/fieldset';
import {InputTextModule} from 'primeng/inputtext';
import {MessageModule} from 'primeng/message';
import {SelectModule} from 'primeng/select';
import {TabsModule} from 'primeng/tabs';
import {ToggleSwitchModule} from 'primeng/toggleswitch';
import {CustomUserReadDto} from '../../../api/generated/model/custom-user-read';
import {DomainReadDto} from '../../../api/generated/model/domain-read';
import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {AuthService} from '../../../services/auth/auth';
import {DomainService} from '../../../services/domain/domain';
import {UserService} from '../../../services/user/user';
import {getLocalizedDomainName} from '../../../shared/i18n/domain-label';
import {interp, plural} from '../../../shared/i18n/format';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {DirtyGuardDirective} from '../../../shared/directives/dirty-guard.directive';
import {LoadingSkeleton} from '../../../shared/components/loading-skeleton/loading-skeleton';
import {RelativeDatePipe} from '../../../shared/pipes/relative-date.pipe';
import {SavedAtComponent} from '../../../shared/components/saved-at/saved-at';
import {runSave} from '../../../shared/forms/run-save';
import {AppToastService} from '../../../shared/toast/app-toast.service';

@Component({
  selector: 'app-preferences',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    DialogModule,
    FieldsetModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TabsModule,
    ToggleSwitchModule,
    RelativeDatePipe,
    DirtyGuardDirective,
    LoadingSkeleton,
    SavedAtComponent,
  ],
  templateUrl: './preferences.html',
  styleUrls: ['./preferences.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Preferences implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly domainService = inject(DomainService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly toast = inject(AppToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly lastSavedAt = signal<Date | null>(null);
  readonly availableDomains = signal<DomainReadDto[]>([]);
  readonly visibleDomains = signal<DomainReadDto[]>([]);
  readonly currentUser = signal<CustomUserReadDto | null>(null);
  readonly linkDialogVisible = signal(false);
  readonly selectedDomainIdsToLink = signal<number[]>([]);

  // --- Danger zone: account deletion ---
  readonly deleteDialogVisible = signal(false);
  readonly deleteConfirmInput = signal('');
  readonly deleting = signal(false);
  readonly deleteBlockMessage = signal<string | null>(null);

  private readonly auth = inject(AuthService);

  /** Sub-tab routing — keeps the URL deep-linkable via ``?tab=...``
   *  while letting the user navigate between Profile / Domains /
   *  Notifications without scrolling through a monolithic page. */
  readonly activeSection = signal<'profile' | 'domains' | 'notifications'>('profile');
  private readonly route = inject(ActivatedRoute);

  onSectionChange(value: string | number | undefined): void {
    if (value === 'profile' || value === 'domains' || value === 'notifications') {
      this.activeSection.set(value);
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {tab: value === 'profile' ? null : value},
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.email]],
    first_name: [''],
    last_name: [''],
    language: [LanguageEnumDto.En, [Validators.required]],
  });

  readonly ui = inject(UiTextService).ui;

  get languageOptions() {
    return [
      {label: 'Français', value: LanguageEnumDto.Fr},
      {label: 'Nederlands', value: LanguageEnumDto.Nl},
      {label: 'English', value: LanguageEnumDto.En},
      {label: 'Italiano', value: LanguageEnumDto.It},
      {label: 'Español', value: LanguageEnumDto.Es},
    ];
  }

  get roleLabel(): string {
    const me = this.currentUser();
    if (!me) {
      return '-';
    }
    if (me.is_superuser) {
      return this.ui().preferences.roleSuperuser;
    }
    if (me.is_staff) {
      return this.ui().preferences.roleManager;
    }
    return this.ui().preferences.roleUser;
  }

  get visibleDomainEntries() {
    const me = this.currentUser();
    if (!me) {
      return [];
    }

    return this.visibleDomains().map((domain) => {
      const isOwner = domain.owner?.id === me.id;
      const isDomainManager = !isOwner && (domain.managers ?? []).some((user) => user.id === me.id);
      const isLinkedOnly = !isOwner && !isDomainManager;
      return {
        id: domain.id,
        name: this.getDomainLabel(domain),
        role: isOwner
          ? this.ui().preferences.roleOwner
          : (isDomainManager ? this.ui().preferences.roleManager : this.ui().preferences.roleMember),
        ownerName: domain.owner?.name || '-',
        isCurrent: me.current_domain === domain.id,
        canSetCurrent: me.current_domain !== domain.id,
        canUnlink: isLinkedOnly,
        canDelete: isOwner,
      };
    });
  }

  get linkableDomainEntries() {
    const linkedIds = new Set(this.visibleDomains().map((domain) => domain.id));
    return this.availableDomains()
      .filter((domain) => !linkedIds.has(domain.id))
      .map((domain) => ({
        id: domain.id,
        name: this.getDomainLabel(domain),
      }));
  }

  ngOnInit(): void {
    // Deep-link support: ``/preferences?tab=notifications`` lands the
    // user directly on the notif matrix. Subscribed once and forgotten
    // — subsequent tab changes are driven by the user's clicks, not
    // by the URL.
    const initialTab = this.route.snapshot.queryParamMap.get('tab');
    if (initialTab === 'domains' || initialTab === 'notifications') {
      this.activeSection.set(initialTab);
    }

    this.loading.set(true);
    forkJoin({
      me: this.userService.currentUserOrFetch(),
      availableDomains: this.domainService.availableForLinking(),
      visibleDomains: this.domainService.list(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({me, availableDomains, visibleDomains}) => {
          const currentUser = Array.isArray(me) ? me[0] : me;
          this.currentUser.set(currentUser);
          this.availableDomains.set(availableDomains ?? []);
          this.visibleDomains.set(visibleDomains ?? []);
          this.form.patchValue({
            email: currentUser.email ?? '',
            first_name: currentUser.first_name ?? '',
            last_name: currentUser.last_name ?? '',
            language: currentUser.language ?? LanguageEnumDto.En,
          });
        },
        error: (err) => {
          this.toast.addApiError(err, this.ui().preferences.loadError);
        },
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const me = this.currentUser();
    if (!me) {
      this.toast.add({severity: 'error', detail: this.ui().preferences.userMissing});
      return;
    }

    const raw = this.form.getRawValue();
    const source = this.userService.updateMeProfile({
        email: raw.email || '',
        first_name: raw.first_name || '',
        last_name: raw.last_name || '',
        language: raw.language,
      })
      .pipe(switchMap((updatedUser) => forkJoin({
        profile: of(updatedUser),
        visibleDomains: this.domainService.list(),
      })));

    this.runSave(source, {
      onSuccess: ({profile, visibleDomains}) => {
        const updatedUser = Array.isArray(profile) ? profile[0] : profile;
        this.currentUser.set(updatedUser);
        this.visibleDomains.set(visibleDomains ?? []);
        this.form.patchValue({
          email: updatedUser.email ?? '',
          first_name: updatedUser.first_name ?? '',
          last_name: updatedUser.last_name ?? '',
          language: updatedUser.language ?? LanguageEnumDto.En,
        });
      },
      successDetail: this.ui().preferences.saveSuccess,
      errorDetail: this.ui().preferences.saveError,
      bumpSavedAt: true,
    });
  }

  goChangePassword(): void {
    void this.router.navigate(['/change-password']);
  }

  openLinkDomainsDialog(): void {
    this.selectedDomainIdsToLink.set([]);
    this.linkDialogVisible.set(true);
  }

  closeLinkDomainsDialog(): void {
    this.linkDialogVisible.set(false);
    this.selectedDomainIdsToLink.set([]);
  }

  // --- Account deletion (GDPR right of erasure) ---------------------------

  openDeleteAccountDialog(): void {
    this.deleteConfirmInput.set('');
    this.deleteBlockMessage.set(null);
    this.deleteDialogVisible.set(true);
  }

  closeDeleteAccountDialog(): void {
    if (this.deleting()) {
      return;
    }
    this.deleteDialogVisible.set(false);
    this.deleteConfirmInput.set('');
    this.deleteBlockMessage.set(null);
  }

  /** Guard: only enable the destructive button once the user has typed
   *  their own email exactly. Cheap accidental-click protection. */
  readonly deleteConfirmReady = (): boolean => {
    const me = this.currentUser();
    return !!me && this.deleteConfirmInput().trim() === me.email;
  };

  confirmDeleteAccount(): void {
    if (!this.deleteConfirmReady() || this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.deleteBlockMessage.set(null);
    this.userService.deleteMe()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.toast.add({
            severity: 'success',
            detail: this.ui().preferences.deleteSuccess,
          });
          // Log out client-side and bounce home. The session/JWT is now
          // tied to a deleted user; any subsequent API call will 401.
          this.auth.logout();
          void this.router.navigate(['/home']);
        },
        error: (err: unknown) => {
          this.deleting.set(false);
          const e = err as {error?: {detail?: string; owned_count?: number}; status?: number};
          if (e?.status === 409 && e.error?.detail === 'owner_of_domains') {
            const count = e.error.owned_count ?? 1;
            this.deleteBlockMessage.set(plural(this.ui().preferences.deleteOwnedDomainsBlock, count, {count}));
            return;
          }
          this.toast.addApiError(err, this.ui().preferences.deleteError);
        },
      });
  }

  protected deleteConfirmMessage(email: string): string {
    // The i18n string still carries a ``{username}`` placeholder; feed it
    // the email now used as the confirmation token.
    return interp(this.ui().preferences.deleteConfirmMessage, {username: email});
  }

  toggleDomainToLink(domainId: number): void {
    const current = this.selectedDomainIdsToLink();
    this.selectedDomainIdsToLink.set(
      current.includes(domainId)
        ? current.filter((id) => id !== domainId)
        : [...current, domainId],
    );
  }

  linkSelectedDomains(): void {
    const me = this.currentUser();
    const selected = this.selectedDomainIdsToLink();
    if (!me || selected.length === 0) {
      this.closeLinkDomainsDialog();
      return;
    }
    const managed_domain_ids = Array.from(new Set([...(me.managed_domain_ids ?? []), ...selected]));
    this.persistLinkedDomains(managed_domain_ids, true);
  }

  setCurrentDomain(domainId: number): void {
    const source = this.userService.setCurrentDomain(domainId).pipe(
      switchMap((profile) => forkJoin({
        profile: of(profile),
        visibleDomains: this.domainService.list(),
      })),
    );
    this.runSave(source, {
      onSuccess: ({profile, visibleDomains}) => {
        this.currentUser.set(profile);
        this.visibleDomains.set(visibleDomains ?? []);
      },
      successDetail: this.ui().preferences.saveSuccess,
      errorDetail: this.ui().preferences.saveError,
    });
  }

  /**
   * Voluntary self-leave: removes the current user from this domain's
   * members + managers via the dedicated backend action. Refreshes the
   * user profile + visible/available domains so the UI reflects the new
   * state immediately.
   */
  unlinkDomain(domainId: number): void {
    const source = this.domainService.leave(domainId).pipe(
      switchMap(() => forkJoin({
        profile: this.userService.getMe(),
        visibleDomains: this.domainService.list(),
        availableDomains: this.domainService.availableForLinking(),
      })),
    );
    this.runSave(source, {
      onSuccess: ({profile, visibleDomains, availableDomains}) => {
        this.currentUser.set(profile);
        this.visibleDomains.set(visibleDomains ?? []);
        this.availableDomains.set(availableDomains ?? []);
      },
      successDetail: this.ui().preferences.saveSuccess,
      errorDetail: this.ui().preferences.saveError,
    });
  }

  /**
   * Cancel one of the current user's pending join requests. Refreshes
   * the user profile so the pending list reflects the cancellation.
   */
  cancelPendingRequest(domainId: number, requestId: number): void {
    const source = this.domainService.cancelJoinRequest(domainId, requestId).pipe(
      switchMap(() => this.userService.getMe()),
    );
    this.runSave(source, {
      onSuccess: (profile) => this.currentUser.set(profile),
      successDetail: this.ui().preferences.saveSuccess,
      errorDetail: this.ui().preferences.saveError,
    });
  }

  /**
   * Localized name for a pending request's target domain. Falls back to
   * the available-domains catalog if the user hasn't been admitted yet,
   * so the user can see *what* they applied to even before approval.
   */
  pendingDomainName(domainId: number): string {
    const visible = this.visibleDomains().find((d) => d.id === domainId);
    if (visible) {
      return this.getDomainLabel(visible);
    }
    const available = this.availableDomains().find((d) => d.id === domainId);
    if (available) {
      return this.getDomainLabel(available);
    }
    return `Domain #${domainId}`;
  }

  /**
   * Canonical notification kinds — keep in sync with
   * ``customuser/notifications.py NOTIFICATION_KINDS``.
   *
   * Each entry pairs the wire-format kind string with a role
   * (``user`` | ``manager`` | ``owner``). The UI uses the role to
   * filter out toggles that do not apply to the current user (a
   * simple user never receives ``domain.transfer.received``, no
   * point asking them about it).
   */
  readonly notificationCatalog = [
    {kind: 'domain.join_request.created', role: 'manager' as const, category: 'domain' as const},
    {kind: 'domain.join_request.decided', role: 'user' as const, category: 'domain' as const},
    {kind: 'domain.join_request.expiry_warning', role: 'user' as const, category: 'domain' as const},
    {kind: 'domain.invite.received', role: 'user' as const, category: 'domain' as const},
    {kind: 'domain.transfer.received', role: 'owner' as const, category: 'domain' as const},
    {kind: 'quiz.assignment', role: 'user' as const, category: 'quiz' as const},
    {kind: 'quiz.completed', role: 'owner' as const, category: 'quiz' as const},
    {kind: 'quiz.result_available', role: 'user' as const, category: 'quiz' as const},
    {kind: 'quiz.detail_available', role: 'user' as const, category: 'quiz' as const},
    {kind: 'lms.course_invite.sent', role: 'manager' as const, category: 'lms' as const},
    {kind: 'lms.course_invite.received', role: 'user' as const, category: 'lms' as const},
    {kind: 'lms.course_invite.accepted', role: 'manager' as const, category: 'lms' as const},
    {kind: 'lms.course_enrollment_request.created', role: 'manager' as const, category: 'lms' as const},
  ];

  /** Category ordering used by the template to render the
   *  ``<p-fieldset>`` sections. Each appears only when the user has
   *  at least one eligible kind in it (a domain-less learner gets
   *  ``lms`` collapsed, etc.). */
  readonly notificationCategories = ['domain', 'quiz', 'lms'] as const;

  /** Kinds in ``category`` the calling user is eligible for, given
   *  their role(s). Empty array hides the category entirely. */
  kindsInCategory(category: 'domain' | 'quiz' | 'lms') {
    return this.notificationCatalog.filter(
      (entry) => entry.category === category && this.hasRole(entry.role),
    );
  }

  /** Localised header for a notification category fieldset. */
  notificationCategoryLabel(category: 'domain' | 'quiz' | 'lms'): string {
    const t = this.ui().preferences;
    if (category === 'domain') return t.notificationCategoryDomain;
    if (category === 'quiz') return t.notificationCategoryQuiz;
    return t.notificationCategoryLms;
  }

  /** True iff the current user holds at least one role of that kind. */
  hasRole(role: 'user' | 'manager' | 'owner'): boolean {
    const me = this.currentUser();
    if (!me) {
      return false;
    }
    if (role === 'user') {
      return true;
    }
    if (role === 'owner') {
      return (me.owned_domain_ids ?? []).length > 0 || me.is_superuser === true;
    }
    return (
      (me.managed_domain_ids ?? []).length > 0
      || (me.owned_domain_ids ?? []).length > 0
      || me.is_superuser === true
    );
  }

  /** Channel-level pref read with both-channels-on as the default. */
  isChannelEnabled(kind: string, channel: 'email' | 'web'): boolean {
    const me = this.currentUser();
    const prefs = (me?.notification_prefs as Record<string, unknown> | null | undefined) ?? {};
    const entry = prefs[kind];
    if (entry === false) {
      // Legacy boolean shape, only the email channel was muted.
      return channel === 'web';
    }
    if (entry && typeof entry === 'object') {
      const map = entry as Record<string, unknown>;
      return map[channel] !== false;
    }
    return true;
  }

  /** Localised label for a notification kind. */
  notificationKindLabel(kind: string): string {
    const t = this.ui().preferences;
    switch (kind) {
      case 'domain.join_request.created':
        return t.notificationKindJoinRequestCreated;
      case 'domain.join_request.decided':
        return t.notificationKindJoinRequestDecided;
      case 'domain.join_request.expiry_warning':
        return t.notificationKindJoinRequestExpiry;
      case 'domain.invite.received':
        return t.notificationKindInviteReceived;
      case 'domain.transfer.received':
        return t.notificationKindTransferReceived;
      case 'quiz.assignment':
        return t.notificationKindQuizAssignment;
      case 'quiz.completed':
        return t.notificationKindQuizCompleted;
      case 'quiz.result_available':
        return t.notificationKindQuizResultAvailable;
      case 'quiz.detail_available':
        return t.notificationKindQuizDetailAvailable;
      case 'lms.course_invite.sent':
        return t.notificationKindCourseInviteSent;
      case 'lms.course_invite.received':
        return t.notificationKindCourseInviteReceived;
      case 'lms.course_invite.accepted':
        return t.notificationKindCourseInviteAccepted;
      case 'lms.course_enrollment_request.created':
        return t.notificationKindCourseEnrollmentRequest;
      default:
        return kind;
    }
  }

  /** Localised label for a role grouping header. */
  roleLabelFor(role: 'user' | 'manager' | 'owner'): string {
    const t = this.ui().preferences;
    if (role === 'owner') return t.notificationGroupOwner;
    if (role === 'manager') return t.notificationGroupManager;
    return t.notificationGroupUser;
  }

  /**
   * Flip one channel for one kind and persist. The other channel is
   * preserved. Either channel staying at ``true`` is encoded by the
   * absence of that channel from the persisted dict (sparse format).
   */
  toggleChannel(kind: string, channel: 'email' | 'web', enabled: boolean): void {
    const me = this.currentUser();
    if (!me) {
      return;
    }
    const next: Record<string, Record<string, boolean>> = {};
    const current = (me.notification_prefs as Record<string, unknown> | null) ?? {};
    // Carry over any other channel mute the user already has, in the
    // new shape. Legacy ``false`` is treated as ``{email: false}``.
    for (const [k, v] of Object.entries(current)) {
      if (v === false) {
        next[k] = {email: false};
      } else if (v && typeof v === 'object') {
        const channelMap: Record<string, boolean> = {};
        for (const ch of ['email', 'web'] as const) {
          if ((v as Record<string, unknown>)[ch] === false) {
            channelMap[ch] = false;
          }
        }
        if (Object.keys(channelMap).length > 0) {
          next[k] = channelMap;
        }
      }
    }
    const entry: Record<string, boolean> = {...(next[kind] ?? {})};
    if (enabled) {
      delete entry[channel];
    } else {
      entry[channel] = false;
    }
    if (Object.keys(entry).length > 0) {
      next[kind] = entry;
    } else {
      delete next[kind];
    }
    const source = this.userService.updateMeProfile(
      {notification_prefs: next as unknown as object} as unknown as Parameters<typeof this.userService.updateMeProfile>[0],
    );
    this.runSave(source, {
      onSuccess: (updated) => this.currentUser.set(updated),
      successDetail: this.ui().preferences.notificationsSaved,
      errorDetail: this.ui().preferences.saveError,
      bumpSavedAt: true,
    });
  }

  /**
   * Pending requests with a friendly domain name, surfaced for the
   * "Mes demandes en attente" section.
   */
  get pendingRequestEntries(): Array<{id: number; domainId: number; name: string; createdAt: string}> {
    const me = this.currentUser();
    if (!me) {
      return [];
    }
    const pending = (me.pending_join_requests ?? []) as Array<{id: number; domain_id: number; created_at: string}>;
    return pending.map((req) => ({
      id: req.id,
      domainId: req.domain_id,
      name: this.pendingDomainName(req.domain_id),
      createdAt: req.created_at,
    }));
  }

  deleteOwnedDomain(domainId: number): void {
    const source = this.domainService.delete(domainId).pipe(
      switchMap(() => forkJoin({
        profile: this.userService.getMe(),
        visibleDomains: this.domainService.list(),
        availableDomains: this.domainService.availableForLinking(),
      })),
    );
    this.runSave(source, {
      onSuccess: ({profile, visibleDomains, availableDomains}) => {
        this.currentUser.set(profile);
        this.visibleDomains.set(visibleDomains ?? []);
        this.availableDomains.set(availableDomains ?? []);
      },
      successDetail: this.ui().preferences.deleteDomainSuccess,
      errorDetail: this.ui().preferences.deleteDomainError,
    });
  }

  private persistLinkedDomains(managed_domain_ids: number[], closeDialog: boolean): void {
    const source = this.userService.updateMeProfile({managed_domain_ids}).pipe(
      switchMap((profile) => forkJoin({
        profile: of(profile),
        visibleDomains: this.domainService.list(),
        availableDomains: this.domainService.availableForLinking(),
      })),
    );
    this.runSave(source, {
      onSuccess: ({profile, visibleDomains, availableDomains}) => {
        this.currentUser.set(profile);
        this.visibleDomains.set(visibleDomains ?? []);
        this.availableDomains.set(availableDomains ?? []);
        if (closeDialog) {
          this.closeLinkDomainsDialog();
        }
      },
      successDetail: this.ui().preferences.saveSuccess,
      errorDetail: this.ui().preferences.saveError,
    });
  }

  private getDomainLabel(domain: DomainReadDto): string {
    return getLocalizedDomainName(domain, this.userService.currentLang);
  }

  private runSave<T>(
    source: Observable<T>,
    options: {
      onSuccess: (value: T) => void;
      successDetail: string;
      errorDetail: string;
      bumpSavedAt?: boolean;
    },
  ): void {
    runSave({
      saving: this.saving,
      lastSavedAt: this.lastSavedAt,
      destroyRef: this.destroyRef,
      toast: this.toast,
    }, source, options);
  }
}
