import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {filter} from 'rxjs/operators';
import {NavigationEnd, Router, RouterLink, RouterLinkActive} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {UserService} from '../../services/user/user';
import {LangSelectComponent} from '../lang-select/lang-select';
import {UserMenuComponent} from '../user-menu/user-menu';
import {SupportedLanguage} from '../../../environments/language';
import {ROUTES} from '../../app.routes-paths';
import {QuizAlertService} from '../../services/quiz-alert/quiz-alert';
import {getUiText} from '../../shared/i18n/ui-text';

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

@Component({
  selector: 'app-topmenu',
  standalone: true,
  imports: [
    ButtonModule,
    RouterLink,
    RouterLinkActive,
    LangSelectComponent,
    UserMenuComponent,
  ],
  templateUrl: './topmenu.html',
  styleUrl: './topmenu.scss'
})
export class TopMenuComponent implements OnInit {
  constructor(private router: Router) {
  }

  app = window.__APP__!;
  private userService = inject(UserService);
  private readonly quizAlertService = inject(QuizAlertService);
  private readonly destroyRef = inject(DestroyRef);

  currentLang: SupportedLanguage = this.userService.currentLang;

  get ui() {
    return getUiText(this.userService.currentLang);
  }

  get navItems(): NavItem[] {
    const isStaff = this.userService.isAdmin();
    const items: NavItem[] = [
      {
        label: this.ui.topmenu.quiz,
        link: ROUTES.quiz.list(),
      },
    ];

    if (isStaff) {
      items.unshift(
        {
          label: this.ui.topmenu.domains,
          link: ROUTES.domain.list(),
        },
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

    items.push({
      label: this.ui.topmenu.about,
      link: ['/about'],
    });

    return items;
  }

  onLangChange(lang: SupportedLanguage) {
    this.currentLang = lang;
    this.userService.setLang(lang);

    const reloadCurrentPage = () => window.location.reload();

    if (!this.userService.currentUser()) {
      reloadCurrentPage();
      return;
    }

    this.userService.updateMeLanguage(lang).subscribe({
      next: reloadCurrentPage,
      error: reloadCurrentPage,
    });
  }

  ngOnInit(): void {
    this.refreshUnreadCount();
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshUnreadCount());
  }

  goHome() {
    this.router.navigate(ROUTES.home());
  }

  goAlerts(): void {
    this.router.navigate(ROUTES.quiz.alerts());
  }

  get unreadAlertCount(): number {
    return this.quizAlertService.unreadCount();
  }

  private refreshUnreadCount(): void {
    if (this.userService.currentUser()) {
      this.quizAlertService.refreshUnreadCount().subscribe({
        error: () => this.quizAlertService.clearUnreadCount(),
      });
      return;
    }

    this.userService.getMe().subscribe({
      next: () => {
        this.quizAlertService.refreshUnreadCount().subscribe({
          error: () => this.quizAlertService.clearUnreadCount(),
        });
      },
      error: () => this.quizAlertService.clearUnreadCount(),
    });
  }
}
