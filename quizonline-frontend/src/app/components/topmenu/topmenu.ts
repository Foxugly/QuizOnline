import {ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, OnInit, signal, ViewChild} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {filter} from 'rxjs/operators';
import {NavigationEnd, Router, RouterLink, RouterLinkActive} from '@angular/router';

import {CustomUserReadDto} from '../../api/generated/model/custom-user-read';
import {DomainReadDto} from '../../api/generated/model/domain-read';
import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {UserService} from '../../services/user/user';
import {LangSelectComponent} from '../lang-select/lang-select';
import {UserMenuComponent} from '../user-menu/user-menu';
import {SupportedLanguage} from '../../../environments/language';
import {ROUTES} from '../../app.routes-paths';
import {QuizAlertService} from '../../services/quiz-alert/quiz-alert';
import {getUiText} from '../../shared/i18n/ui-text';
import {DomainService, DomainTranslations} from '../../services/domain/domain';
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
};

type AdminNavItem = {
  label: string;
  icon: string;
  link: readonly string[];
};

@Component({
  selector: 'app-topmenu',
  imports: [
    RouterLink,
    RouterLinkActive,
    LangSelectComponent,
    UserMenuComponent,
  ],
  templateUrl: './topmenu.html',
  styleUrl: './topmenu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'(document:click)': 'closeMenus($event)'},
})
export class TopMenuComponent implements OnInit {
  @ViewChild('domainMenuRoot') private readonly domainMenuRoot?: ElementRef<HTMLElement>;
  @ViewChild('adminMenuRoot') private readonly adminMenuRoot?: ElementRef<HTMLElement>;

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly domainService = inject(DomainService);
  private readonly quizAlertService = inject(QuizAlertService);
  private readonly destroyRef = inject(DestroyRef);
  app = window.__APP__!;
  currentLang: SupportedLanguage = this.userService.currentLang;
  readonly visibleDomains = signal<DomainReadDto[]>([]);
  readonly domainMenuOpen = signal(false);
  readonly adminMenuOpen = signal(false);

  get ui() {
    return getUiText(this.userService.currentLang);
  }

  get currentUser(): CustomUserReadDto | null {
    return this.userService.currentUser();
  }

  get currentDomainLabel(): string {
    return this.currentUser?.current_domain_title?.trim() || this.ui.topmenu.noDomains;
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
    const items: NavItem[] = [
    ];

    if (isAuthenticated) {
      items.push({
        label: this.ui.topmenu.quiz,
        link: ROUTES.quiz.list(),
      });
    }

    if (this.canManageCurrentDomain) {
      items.unshift(
        {
          label: this.ui.topmenu.subjects,
          link: ROUTES.subject.list(),
        },
        {
          label: this.ui.topmenu.questions,
          link: ROUTES.question.list(),
        },
      );
    }

    if (this.canAccessDomainsMenu) {
      items.unshift(
        {
          label: this.ui.topmenu.domains,
          link: ROUTES.domain.list(),
        },
      );
    }

    if (this.currentUser?.is_superuser) {
      items.unshift({
        label: 'Users',
        link: ROUTES.user.list(),
      });
    }

    items.push(
      {
        label: this.ui.topmenu.donate,
        link: ['/donate'],
        accent: true,
      },
      {
        label: this.ui.topmenu.about,
        link: ['/about'],
      },
    );

    return items;
  }

  ngOnInit(): void {
    this.refreshUserContext();
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshUserContext());
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
        label: this.ui.admin.stats.title,
        icon: 'pi pi-chart-bar',
        link: ROUTES.admin.stats(),
      },
      {
        label: this.ui.admin.systemConfig.title,
        icon: 'pi pi-server',
        link: ROUTES.admin.systemConfig(),
      },
      {
        label: this.ui.admin.mailTest.title,
        icon: 'pi pi-send',
        link: ROUTES.admin.mailTest(),
      },
    ];
    if (this.userService.isSuperuser()) {
      items.push({
        label: this.ui.admin.languages.title,
        icon: 'pi pi-language',
        link: ROUTES.admin.languages(),
      });
    }
    return items;
  }

  toggleAdminMenu(event: Event): void {
    event.stopPropagation();
    this.domainMenuOpen.set(false);
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
  }

  getDomainLabel(domain: DomainReadDto): string {
    const translations = domain.translations as DomainTranslations | undefined;
    const lang = this.userService.currentLang;
    const current = translations?.[lang]?.name?.trim();
    if (current) {
      return current;
    }

    for (const fallback of [LanguageEnumDto.Fr, LanguageEnumDto.En, LanguageEnumDto.Nl, LanguageEnumDto.It, LanguageEnumDto.Es]) {
      const value = translations?.[fallback]?.name?.trim();
      if (value) {
        return value;
      }
    }

    return `Domain #${domain.id}`;
  }

  private refreshUserContext(): void {
    const me = this.userService.currentUser();
    if (me) {
      this.refreshUnreadCount();
      this.refreshVisibleDomains();
      return;
    }

    if (!this.authService.authenticated) {
      this.quizAlertService.clearUnreadCount();
      this.visibleDomains.set([]);
      return;
    }

    this.userService.getMe().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.refreshUnreadCount();
        this.refreshVisibleDomains();
      },
      error: () => {
        this.quizAlertService.clearUnreadCount();
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
