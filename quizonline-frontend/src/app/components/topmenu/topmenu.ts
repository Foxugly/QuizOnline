import {ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, OnInit, signal, ViewChild} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {filter} from 'rxjs/operators';
import {NavigationEnd, Router, RouterLink, RouterLinkActive} from '@angular/router';

import {CustomUserReadDto} from '../../api/generated/model/custom-user-read';
import {DomainReadDto} from '../../api/generated/model/domain-read';
import {UserService} from '../../services/user/user';
import {LangSelectComponent} from '../lang-select/lang-select';
import {UserMenuComponent} from '../user-menu/user-menu';
import {SupportedLanguage} from '../../../environments/language';
import {LMS_CATALOG, LMS_ME_CERTIFICATES, LMS_ME_PROGRESS, ROUTES} from '../../app.routes-paths';
import {QuizAlertService} from '../../services/quiz-alert/quiz-alert';
import {NotificationService} from '../../services/notification/notification.service';
import {NotificationsBellComponent} from '../notifications-bell/notifications-bell';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {DomainService} from '../../services/domain/domain';
import {getLocalizedDomainName} from '../../shared/i18n/domain-label';
import {AuthService} from '../../services/auth/auth';

declare global {
  interface Window {
    __APP__?: {
      name: string;
      version: string;
      author: string;
      year: string;
      logoSvg: string;
      logoIco: string;
      logoPng: string;
    };
  }
}

type NavItem = {
  label: string;
  link: readonly string[];
  accent?: boolean;
  icon?: string;
};

type AdminNavItem = {
  label: string;
  link: readonly string[];
  icon: string;
};

@Component({
  selector: 'app-topmenu',
  imports: [
    RouterLink,
    RouterLinkActive,
    LangSelectComponent,
    UserMenuComponent,
    NotificationsBellComponent,
  ],
  templateUrl: './topmenu.html',
  styleUrl: './topmenu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'(document:click)': 'closeMenus($event)'},
})
export class TopMenuComponent implements OnInit {
  @ViewChild('domainMenuRoot') private readonly domainMenuRoot?: ElementRef<HTMLElement>;
  @ViewChild('adminMenuRoot') private readonly adminMenuRoot?: ElementRef<HTMLElement>;
  @ViewChild('coursesMenuRoot') private readonly coursesMenuRoot?: ElementRef<HTMLElement>;
  @ViewChild('quizMenuRoot') private readonly quizMenuRoot?: ElementRef<HTMLElement>;
  @ViewChild('mobileMenuRoot') private readonly mobileMenuRoot?: ElementRef<HTMLElement>;

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly domainService = inject(DomainService);
  private readonly quizAlertService = inject(QuizAlertService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  app = window.__APP__!;
  currentLang: SupportedLanguage = this.userService.currentLang;
  readonly ui = inject(UiTextService).ui;
  readonly visibleDomains = signal<DomainReadDto[]>([]);
  readonly domainMenuOpen = signal(false);
  readonly adminMenuOpen = signal(false);
  readonly coursesMenuOpen = signal(false);
  readonly quizMenuOpen = signal(false);
  readonly mobileMenuOpen = signal(false);

  get currentUser(): CustomUserReadDto | null {
    return this.userService.currentUser();
  }

  get currentDomainLabel(): string {
    return this.currentUser?.current_domain_title?.trim() || this.ui().topmenu.noDomains;
  }

  get canManageCurrentDomain(): boolean {
    const me = this.currentUser;
    if (!me) {
      return false;
    }
    if (me.is_superuser) {
      return true;
    }

    const currentDomainId = me.current_domain;
    if (!currentDomainId) {
      return false;
    }

    const currentDomain = this.visibleDomains().find((domain) => domain.id === currentDomainId);
    if (!currentDomain) {
      return false;
    }

    return currentDomain.owner?.id === me.id || (currentDomain.managers ?? []).some((user) => user.id === me.id);
  }

  get canAccessDomainsMenu(): boolean {
    const me = this.currentUser;
    if (!me) {
      return false;
    }
    if (me.is_superuser) {
      return true;
    }

    return this.visibleDomains().some(
      (domain) => domain.owner?.id === me.id || (domain.managers ?? []).some((user) => user.id === me.id),
    );
  }

  get navItems(): NavItem[] {
    const isAuthenticated = !!this.currentUser;
    const items: NavItem[] = [];

    // ----------------------------------------------------------------------
    // Top-level flat entries.
    //
    // Order rendered left-to-right:
    //   1. Utilisateurs (superuser only)
    //   2. Domaines (anyone who owns / manages ≥1 domain, or superuser)
    //   3. Cours dropdown   — rendered in the template after this list
    //   4. Quiz             — flat link for plain members,
    //                         dropdown for owner/manager/superuser
    //                         (the dropdown is rendered in the template
    //                         after this list)
    //
    // Marketing entries (Features, About) only show for visitors.
    // ----------------------------------------------------------------------

    if (this.currentUser?.is_superuser) {
      items.push({
        label: this.ui().topmenu.users,
        link: ROUTES.user.list(),
        icon: 'pi pi-users',
      });
    }

    if (this.canAccessDomainsMenu) {
      items.push({
        label: this.ui().topmenu.domains,
        link: ROUTES.domain.list(),
        icon: 'pi pi-sitemap',
      });
    }

    // Plain members (no domain ownership, no superuser) still get a flat
    // Quiz link. Owners/managers/superusers get a Quiz dropdown rendered
    // by the template (subjects / questions / quiz) instead.
    if (isAuthenticated && !this.showQuizDropdown) {
      items.push({
        label: this.ui().topmenu.quiz,
        link: ROUTES.quiz.list(),
      });
    }

    if (!isAuthenticated) {
      items.push({
        label: this.ui().topmenu.features,
        link: ['/features'],
      });
      // For anonymous visitors, Donate stays inline with Features / About.
      // For authenticated users it's rendered as a standalone block in the
      // template (between Quiz and Admin) via donateItem instead.
      items.push({
        label: this.ui().topmenu.donate,
        link: ['/donate'],
        accent: true,
        icon: 'pi pi-heart',
      });
      items.push({
        label: this.ui().topmenu.about,
        link: ['/about'],
      });
    }

    return items;
  }

  /**
   * The "Soutenir" (donate) accent button, rendered as a standalone
   * entry between the Quiz dropdown and the Admin cog. Returns null
   * for anonymous visitors — they get Donate inline with Features /
   * About via the existing navItems plumbing (handled in the template).
   */
  get donateItem(): NavItem | null {
    if (!this.currentUser) {
      // Anonymous: handled by navItems loop alongside Features/About.
      return null;
    }
    return {
      label: this.ui().topmenu.donate,
      link: ['/donate'],
      accent: true,
      icon: 'pi pi-heart',
    };
  }

  /**
   * Owners, managers and superusers see Quiz as a dropdown that exposes
   * Subjects / Questions / Quiz. Plain members keep the flat Quiz link.
   */
  get showQuizDropdown(): boolean {
    return !!this.currentUser && (this.canManageCurrentDomain || this.currentUser.is_superuser);
  }

  get coursesMenuItems(): AdminNavItem[] {
    return [
      {
        label: this.ui().topmenu.coursesMenuFormations,
        link: [LMS_CATALOG] as const,
        icon: 'pi pi-book',
      },
      {
        label: this.ui().topmenu.lmsMyProgress,
        link: [LMS_ME_PROGRESS] as const,
        icon: 'pi pi-chart-line',
      },
      {
        label: this.ui().topmenu.lmsMyCertificates,
        link: [LMS_ME_CERTIFICATES] as const,
        icon: 'pi pi-verified',
      },
    ];
  }

  get quizMenuItems(): AdminNavItem[] {
    return [
      {
        label: this.ui().topmenu.subjects,
        link: ROUTES.subject.list(),
        icon: 'pi pi-tags',
      },
      {
        label: this.ui().topmenu.questions,
        link: ROUTES.question.list(),
        icon: 'pi pi-question-circle',
      },
      {
        label: this.ui().topmenu.quiz,
        link: ROUTES.quiz.list(),
        icon: 'pi pi-file-edit',
      },
    ];
  }

  toggleCoursesMenu(event: Event): void {
    event.stopPropagation();
    this.adminMenuOpen.set(false);
    this.domainMenuOpen.set(false);
    this.quizMenuOpen.set(false);
    this.coursesMenuOpen.update((value) => !value);
  }

  toggleQuizMenu(event: Event): void {
    event.stopPropagation();
    this.adminMenuOpen.set(false);
    this.domainMenuOpen.set(false);
    this.coursesMenuOpen.set(false);
    this.quizMenuOpen.update((value) => !value);
  }

  goNavItem(item: AdminNavItem): void {
    this.adminMenuOpen.set(false);
    this.domainMenuOpen.set(false);
    this.coursesMenuOpen.set(false);
    this.quizMenuOpen.set(false);
    void this.router.navigate(item.link);
  }

  ngOnInit(): void {
    this.refreshUserContext();
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshUserContext();
        this.mobileMenuOpen.set(false);
      });
  }

  toggleMobileMenu(event: Event): void {
    event.stopPropagation();
    this.mobileMenuOpen.update((value) => !value);
  }

  onLangChange(lang: SupportedLanguage): void {
    this.currentLang = lang;
    this.userService.setLang(lang);

    const reloadCurrentPage = () => window.location.reload();

    if (!this.userService.currentUser()) {
      reloadCurrentPage();
      return;
    }

    this.userService.updateMeLanguage(lang).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: reloadCurrentPage,
      error: reloadCurrentPage,
    });
  }

  toggleDomainMenu(event: Event): void {
    event.stopPropagation();
    this.adminMenuOpen.set(false);
    this.coursesMenuOpen.set(false);
    this.quizMenuOpen.set(false);
    this.domainMenuOpen.update((value) => !value);
  }

  goHome(): void {
    void this.router.navigate(ROUTES.home());
  }

  goAlerts(): void {
    void this.router.navigate(ROUTES.quiz.alerts());
  }

  get isAdmin(): boolean {
    return this.userService.isSuperuser();
  }

  get adminMenuItems(): AdminNavItem[] {
    const items: AdminNavItem[] = [
      {
        label: this.ui().admin.stats.title,
        link: ROUTES.admin.stats(),
        icon: 'pi pi-chart-bar',
      },
      {
        label: this.ui().admin.systemConfig.title,
        link: ROUTES.admin.systemConfig(),
        icon: 'pi pi-server',
      },
      {
        label: this.ui().admin.mailTest.title,
        link: ROUTES.admin.mailTest(),
        icon: 'pi pi-send',
      },
    ];
    if (this.userService.isSuperuser()) {
      items.push({
        label: this.ui().admin.languages.title,
        link: ROUTES.admin.languages(),
        icon: 'pi pi-globe',
      });
    }
    return items;
  }

  toggleAdminMenu(event: Event): void {
    event.stopPropagation();
    this.domainMenuOpen.set(false);
    this.coursesMenuOpen.set(false);
    this.quizMenuOpen.set(false);
    this.adminMenuOpen.update((value) => !value);
  }

  get unreadAlertCount(): number {
    return this.quizAlertService.unreadCount();
  }

  get ownedDomains(): DomainReadDto[] {
    const me = this.currentUser;
    if (!me) {
      return [];
    }

    return this.visibleDomains().filter((domain) => domain.owner?.id === me.id);
  }

  get managedDomainsList(): DomainReadDto[] {
    const me = this.currentUser;
    if (!me) {
      return [];
    }

    return this.visibleDomains().filter(
      (domain) => domain.owner?.id !== me.id && (domain.managers ?? []).some((user) => user.id === me.id),
    );
  }

  get linkedDomains(): DomainReadDto[] {
    const me = this.currentUser;
    if (!me) {
      return [];
    }

    return this.visibleDomains().filter(
      (domain) => domain.owner?.id !== me.id && !(domain.managers ?? []).some((user) => user.id === me.id),
    );
  }

  changeCurrentDomain(domainId: number): void {
    this.domainMenuOpen.set(false);
    this.userService.setCurrentDomain(domainId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => window.location.reload(),
    });
  }

  goPreferences(): void {
    this.domainMenuOpen.set(false);
    void this.router.navigate(['/preferences']);
  }

  goAdmin(item: AdminNavItem): void {
    this.adminMenuOpen.set(false);
    void this.router.navigate(item.link);
  }

  closeMenus(event: Event): void {
    const target = event.target as Node;
    if (!this.domainMenuRoot?.nativeElement.contains(target)) {
      this.domainMenuOpen.set(false);
    }
    if (!this.adminMenuRoot?.nativeElement.contains(target)) {
      this.adminMenuOpen.set(false);
    }
    if (!this.coursesMenuRoot?.nativeElement.contains(target)) {
      this.coursesMenuOpen.set(false);
    }
    if (!this.quizMenuRoot?.nativeElement.contains(target)) {
      this.quizMenuOpen.set(false);
    }
    if (this.mobileMenuOpen() && !this.mobileMenuRoot?.nativeElement.contains(target)) {
      this.mobileMenuOpen.set(false);
    }
  }

  getDomainLabel(domain: DomainReadDto): string {
    return getLocalizedDomainName(domain, this.userService.currentLang);
  }

  private refreshUserContext(): void {
    const me = this.userService.currentUser();
    if (me) {
      this.refreshUnreadCount();
      this.notificationService.startPolling();
      this.refreshVisibleDomains();
      return;
    }

    if (!this.authService.authenticated) {
      this.quizAlertService.clearUnreadCount();
      this.notificationService.stopPolling();
      this.visibleDomains.set([]);
      return;
    }

    this.userService.getMe().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.refreshUnreadCount();
        this.notificationService.startPolling();
        this.refreshVisibleDomains();
      },
      error: () => {
        this.quizAlertService.clearUnreadCount();
        this.notificationService.stopPolling();
        this.visibleDomains.set([]);
      },
    });
  }

  private refreshVisibleDomains(): void {
    if (!this.userService.currentUser()) {
      this.visibleDomains.set([]);
      return;
    }

    this.domainService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (domains) => this.visibleDomains.set(domains),
      error: () => this.visibleDomains.set([]),
    });
  }

  private refreshUnreadCount(): void {
    if (!this.userService.currentUser()) {
      this.quizAlertService.clearUnreadCount();
      return;
    }

    this.quizAlertService.refreshUnreadCount().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      error: () => this.quizAlertService.clearUnreadCount(),
    });
  }
}
