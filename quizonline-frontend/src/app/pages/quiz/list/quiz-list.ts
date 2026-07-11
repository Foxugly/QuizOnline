import {CommonModule} from '@angular/common';
import {Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {catchError, finalize, forkJoin, of} from 'rxjs';
import {TabsModule} from 'primeng/tabs';
import {BadgeModule} from 'primeng/badge';
import {ButtonModule} from 'primeng/button';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {InputTextModule} from 'primeng/inputtext';
import {MessageModule} from 'primeng/message';
import {ConfirmationService} from 'primeng/api';
import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {QuizListDto} from '../../../api/generated/model/quiz-list';
import {QuizSessionTableComponent} from '../../../components/quiz-session-table/quiz-session-table';
import {QuizTemplateTableComponent} from '../../../components/quiz-template-table/quiz-template-table';
import {QuizTemplateAssignDialogComponent} from '../../../components/quiz-template-assign-dialog/quiz-template-assign-dialog';
import {QuizService} from '../../../services/quiz/quiz';
import {QuizTemplateService} from '../../../services/quiz-template/quiz-template';
import {UserService} from '../../../services/user/user';
import {logApiError, userFacingApiMessage} from '../../../shared/api/api-errors';
import {BulkActionsComponent, BulkActionOption} from '../../../shared/components/bulk-actions/bulk-actions';
import {TableSkeleton} from '../../../shared/components/loading-skeleton/table-skeleton';
import {AssignableRecipient, QuizTemplateListItem, UserQuizListItem} from './quiz-list.models';
import {DomainService} from '../../../services/domain/domain';
import {CustomUserReadDto} from '../../../api/generated/model/custom-user-read';
import {DomainReadDto} from '../../../api/generated/model/domain-read';
import {UserSummaryDto} from '../../../api/generated/model/user-summary';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {plural} from '../../../shared/i18n/format';
import {getQuizListUiText} from './quiz-list.i18n';
import {ROUTES} from '../../../app.routes-paths';
import {getLocalizedDomainName} from '../../../shared/i18n/domain-label';

type DomainReadWithMembers = DomainReadDto & {
  members?: UserSummaryDto[];
};

type BulkAction = 'activate' | 'deactivate' | 'delete';

@Component({
  selector: 'app-quiz-list',
  imports: [
    CommonModule,
    FormsModule,
    BadgeModule,
    ButtonModule,
    ConfirmDialogModule,
    InputTextModule,
    MessageModule,
    TabsModule,
    QuizTemplateTableComponent,
    QuizSessionTableComponent,
    QuizTemplateAssignDialogComponent,
    BulkActionsComponent,
    TableSkeleton,
  ],
  providers: [ConfirmationService],
  templateUrl: './quiz-list.html',
  styleUrl: './quiz-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizListPage implements OnInit {
  templates = signal<QuizTemplateListItem[]>([]);
  domains = signal<DomainReadDto[]>([]);
  myQuizzes = signal<UserQuizListItem[]>([]);
  assignableUsers = signal<AssignableRecipient[]>([]);
  activeTab = signal<'templates' | 'sessions'>('templates');
  currentUserId = signal<number | null>(null);
  q = signal('');
  loading = signal(false);
  initialLoad = signal<boolean>(true);
  success = signal<string | null>(null);
  error = signal<string | null>(null);
  creatingTemplateId = signal<number | null>(null);
  assignDialogVisible = signal(false);
  selectedTemplate = signal<QuizTemplateListItem | null>(null);
  selectedRecipientIds = signal<number[]>([]);
  assigning = signal(false);
  selectedTemplates = signal<QuizTemplateListItem[]>([]);
  applyingBulk = signal(false);
  readonly selectedCount = computed(() => this.selectedTemplates().length);

  private readonly quizService = inject(QuizService);
  private readonly quizTemplateService = inject(QuizTemplateService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly domainService = inject(DomainService);
  private readonly confirmationService = inject(ConfirmationService);

  readonly canComposeTemplate = computed(() => this.domains().some((domain) => this.canManageDomain(domain)));
  readonly canCreateQuickTemplate = computed(() => this.domains().length > 0);

  /**
   * Onboarding empty state — shown on the Templates tab when the user
   * manages at least one domain but has no template yet, and isn't
   * narrowing the list with a search query. Hides as soon as the first
   * template appears or the user starts typing.
   */
  readonly showWelcomePanel = computed(() =>
    this.canComposeTemplate()
    && !this.loading()
    && this.templates().length === 0
    && !this.q().trim(),
  );

  readonly currentLang = computed(() => this.userService.currentLang ?? LanguageEnumDto.Fr);
  readonly uiText = inject(UiTextService).localized(getQuizListUiText);
  readonly editorUi = inject(UiTextService).editor;
  readonly bulkActionOptions = computed<BulkActionOption[]>(() => {
    const labels = this.uiText().bulk;
    return [
      {label: labels.activate, value: 'activate', icon: 'pi pi-check-circle'},
      {label: labels.deactivate, value: 'deactivate', icon: 'pi pi-times-circle'},
      {label: labels.delete, value: 'delete', icon: 'pi pi-trash', danger: true},
    ];
  });

  /** Set of domain ids where the current user has a pending join request. */
  readonly pendingDomainIds = computed(() => {
    const requests = this.userService.currentUser()?.pending_join_requests ?? [];
    return new Set(requests.map((req: { domain_id?: number }) => req.domain_id).filter((id): id is number => typeof id === 'number'));
  });

  /** Domains the user has a pending join request for (resolved to known DomainReadDto when possible). */
  readonly pendingDomains = computed(() => {
    const ids = this.pendingDomainIds();
    if (!ids.size) {
      return [] as DomainReadDto[];
    }
    return this.domains().filter((d) => ids.has(d.id));
  });

  /** Comma-joined human-readable names of pending domains, for the banner. */
  readonly pendingDomainNames = computed(() => {
    const lang = this.userService.currentLang;
    const visibleById = new Map(this.domains().map((d) => [d.id, d]));
    return [...this.pendingDomainIds()]
      .map((id) => {
        const domain = visibleById.get(id);
        return domain ? this.localizedDomainName(domain, lang) : `#${id}`;
      })
      .join(', ');
  });

  private localizedDomainName(domain: DomainReadDto, lang: string): string {
    return getLocalizedDomainName(domain, lang);
  }

  readonly filteredTemplates = computed(() => {
    const term = this.normalize(this.q());
    const pending = this.pendingDomainIds();
    return this.templates()
      .filter((template) => !pending.has(template.domain ?? -1))
      .filter((template) =>
        !term || this.matchesSearch(term, template.title, template.description ?? '', template.mode ?? ''),
      );
  });

  readonly filteredMyQuizzes = computed(() => {
    const term = this.normalize(this.q());
    const pending = this.pendingDomainIds();
    return this.myQuizzes()
      .filter((quiz) => !pending.has(quiz.domain ?? -1))
      .filter((quiz) =>
        !term || this.matchesSearch(term, quiz.quiz_template_title, quiz.quiz_template_description, quiz.mode),
      );
  });

  ngOnInit(): void {
    this.load();
  }

  setActiveTab(value: string | number | undefined): void {
    this.activeTab.set(value === 'sessions' ? 'sessions' : 'templates');
  }

  load(): void {
    this.loading.set(true);

    // 1) Fetch the small bits first (domains + current user) so the action
    //    buttons (compose / quick) can render as soon as we know the user's
    //    permissions, without waiting for the templates / sessions list.
    forkJoin({
      domains: this.domainService.list(),
      me: this.getCurrentUser(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({domains, me}) => {
          this.domains.set(domains);
          this.currentUserId.set(me?.id ?? null);
          this.loadTemplatesAndSessions(domains, me);
        },
        error: (err: unknown) => {
          logApiError('quiz.list.load.context', err);
          this.error.set(userFacingApiMessage(err, this.uiText().messages.loadError));
          this.domains.set([]);
          this.currentUserId.set(null);
          this.templates.set([]);
          this.myQuizzes.set([]);
          this.loading.set(false);
          this.initialLoad.set(false);
        },
      });
  }

  private loadTemplatesAndSessions(domains: DomainReadDto[], me: CustomUserReadDto | null): void {
    forkJoin({
      templates: this.quizService.listTemplates(),
      quizzes: this.quizService.listQuiz(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
          this.initialLoad.set(false);
        }),
      )
      .subscribe({
        next: ({templates, quizzes}) => {
          const normalizedTemplates = (templates as QuizTemplateListItem[])
            .map((template) => this.decorateTemplate(template, domains, me))
            .sort((left, right) => left.title.localeCompare(right.title));
          const myQuizSessions = me ? quizzes.filter((quiz) => quiz.user === me.id) : [];

          this.templates.set(normalizedTemplates);
          this.myQuizzes.set(myQuizSessions.map((quiz) => this.toUserQuizListItem(quiz)));
        },
        error: (err: unknown) => {
          logApiError('quiz.list.load.lists', err);
          this.error.set(userFacingApiMessage(err, this.uiText().messages.loadError));
          this.templates.set([]);
          this.myQuizzes.set([]);
        },
      });
  }

  goNew(): void {
    this.quizService.goQuickQuiz();
  }

  goCompose(): void {
    this.quizService.goCompose();
  }

  /** Welcome panel CTAs. */
  goCreateSubject(): void {
    void this.router.navigate(['/subject/add']);
  }

  goCreateQuestion(): void {
    void this.router.navigate(['/question/add']);
  }

  onTemplatesSelectionChange(rows: QuizTemplateListItem[]): void {
    this.selectedTemplates.set(rows);
  }

  applyBulk(action: string): void {
    if (this.selectedCount() === 0 || this.applyingBulk()) {
      return;
    }
    switch (action as BulkAction) {
      case 'activate':
        this.bulkPatch(true);
        return;
      case 'deactivate':
        this.bulkPatch(false);
        return;
      case 'delete':
        this.confirmBulkDelete();
        return;
    }
  }

  private bulkPatch(active: boolean): void {
    const ids = this.selectedTemplates().map(t => t.id);
    if (!ids.length) {
      return;
    }
    this.applyingBulk.set(true);
    forkJoin(ids.map(id => this.quizTemplateService.partialUpdate(id, {active}))).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.selectedTemplates.set([]);
        this.load();
      },
      error: (err: unknown) => logApiError('quiz.list.bulk-patch', err),
      complete: () => this.applyingBulk.set(false),
    });
  }

  private confirmBulkDelete(): void {
    const ids = this.selectedTemplates().map(t => t.id);
    if (!ids.length) {
      return;
    }
    const labels = this.editorUi().bulkList;
    this.confirmationService.confirm({
      header: labels.confirmDeleteHeader,
      message: plural(labels.confirmDeleteTemplates, ids.length),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: labels.confirmDeleteAccept,
      rejectLabel: labels.confirmDeleteCancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.runBulkDelete(ids),
    });
  }

  private runBulkDelete(ids: number[]): void {
    this.applyingBulk.set(true);
    forkJoin(ids.map(id => this.quizTemplateService.destroy(id))).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.selectedTemplates.set([]);
        this.load();
      },
      error: (err: unknown) => logApiError('quiz.list.bulk-delete', err),
      complete: () => this.applyingBulk.set(false),
    });
  }

  goEditTemplate(templateId: number): void {
    this.router.navigate(['/quiz/template', templateId, 'edit']);
  }

  goDeleteTemplate(templateId: number): void {
    this.router.navigate(['/quiz/template', templateId, 'delete']);
  }

  openAssignDialog(template: QuizTemplateListItem): void {
    this.selectedTemplate.set(template);
    this.selectedRecipientIds.set([]);
    this.assignableUsers.set(this.buildAssignableUsers(template));
    this.assignDialogVisible.set(true);
    this.success.set(null);
  }

  closeAssignDialog(): void {
    this.assignDialogVisible.set(false);
    this.selectedTemplate.set(null);
    this.selectedRecipientIds.set([]);
  }

  submitAssignments(): void {
    const template = this.selectedTemplate();
    const userIds = this.selectedRecipientIds();
    if (!template || !userIds.length) {
      return;
    }

    this.assigning.set(true);
    this.quizService.assignTemplateToUsers(template.id, userIds)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.assigning.set(false)),
      )
      .subscribe({
        next: (created) => {
          this.success.set(this.uiText().messages.assignSuccess(created.length));
          this.closeAssignDialog();
          void this.router.navigate(ROUTES.quiz.templateResults(template.id));
        },
        error: (err: unknown) => {
          logApiError('quiz.list.assign-template', err);
          this.error.set(userFacingApiMessage(err, this.uiText().messages.assignError));
        },
      });
  }

  goResults(templateId: number): void {
    void this.router.navigate(ROUTES.quiz.templateResults(templateId));
  }

  createFromTemplate(templateId: number): void {
    this.creatingTemplateId.set(templateId);
    this.quizService
      .createQuizFromTemplate(templateId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.creatingTemplateId.set(null)),
      )
      .subscribe({
        next: (quiz) => this.quizService.goView(quiz.id),
        error: (err: unknown) => {
          logApiError('quiz.list.create-session', err);
          this.error.set(userFacingApiMessage(err, this.uiText().messages.createError));
        },
      });
  }

  goView(id: number): void {
    this.quizService.goView(id);
  }

  private getCurrentUser() {
    return this.userService.currentUserOrFetch().pipe(catchError(() => of(null)));
  }

  private toUserQuizListItem(quiz: QuizListDto): UserQuizListItem {
    return {
      ...quiz,
      status: quiz.ended_at ? 'answered' : (quiz.started_at ? 'in_progress' : 'not_started'),
    };
  }

  private matchesSearch(term: string, ...values: string[]): boolean {
    return values.some((value) => this.normalize(value).includes(term));
  }

  private decorateTemplate(
    template: QuizTemplateListItem,
    domains: DomainReadDto[],
    me: { id: number; is_staff?: boolean; is_superuser?: boolean } | null,
  ): QuizTemplateListItem {
    const domain = domains.find((item) => item.id === template.domain);
    const managesDomain = !!me && !!domain && this.canManageDomain(domain);
    const isCreator = !!me && template.created_by === me.id;

    return {
      ...template,
      ownerLabel: template.created_by_username || (template.created_by ? `User #${template.created_by}` : '-'),
      canManage: managesDomain,
      canAssign: managesDomain,
      canEdit: managesDomain,
      canDelete: managesDomain || isCreator,
      canViewResults: managesDomain,
    };
  }

  private buildAssignableUsers(template: QuizTemplateListItem): AssignableRecipient[] {
    const domain = this.domains().find((item) => item.id === template.domain) as DomainReadWithMembers | undefined;
    if (!domain) {
      return [];
    }

    const currentUserId = this.currentUserId();
    const recipients = new Map<number, AssignableRecipient>();
    const addRecipient = (user: UserSummaryDto | null | undefined, role: AssignableRecipient['role']) => {
      if (!user || user.id === currentUserId) {
        return;
      }
      const existing = recipients.get(user.id);
      if (existing) {
        if (existing.role === 'member' && role !== 'member') {
          recipients.set(user.id, {...existing, role});
        }
        return;
      }
      recipients.set(user.id, {id: user.id, username: user.username, role});
    };

    addRecipient(domain.owner, 'owner');
    for (const managerUser of domain.managers ?? []) {
      addRecipient(managerUser, 'manager');
    }
    for (const member of domain.members ?? []) {
      addRecipient(member, 'member');
    }

    return [...recipients.values()].sort((left, right) => left.username.localeCompare(right.username));
  }

  private canManageDomain(domain: DomainReadDto): boolean {
    const me = this.userService.currentUser();
    if (!me) {
      return false;
    }
    if (me.is_superuser) {
      return true;
    }
    return domain.owner?.id === me.id || (domain.managers ?? []).some((user) => user.id === me.id);
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '').trim().toLocaleLowerCase();
  }
}
