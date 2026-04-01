import {CommonModule} from '@angular/common';
import {Component, inject} from '@angular/core';

import {Subscription} from 'rxjs';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {UserService} from '../../services/user/user';
import {LangSelectComponent} from '../lang-select/lang-select';
import {UserMenuComponent} from '../user-menu/user-menu';
import {SupportedLanguage} from '../../../environments/language';
import {environment} from '../../../environments/environment';
import {ROUTES} from '../../app.routes-paths';

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
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    LangSelectComponent,
    UserMenuComponent,
  ],
  templateUrl: './topmenu.html',
  styleUrl: './topmenu.scss'
})
export class TopmenuComponent {
  constructor(private router: Router) {
  }

  app = window.__APP__!;
  private userService = inject(UserService);

  currentLang: SupportedLanguage = this.userService.currentLang;
  private sub?: Subscription;

  get isStaff(): boolean {
    return this.userService.isAdmin();
  }

  get navItems(): NavItem[] {
    const isStaff = this.userService.isAdmin();
    const items: NavItem[] = [
      {
        label: 'Quiz',
        link: ROUTES.quiz.list(),
      },
    ];

    if (isStaff) {
      items.unshift(
        {
          label: 'Domaines',
          link: ROUTES.domain.list(),
        },
        {
          label: 'Sujets',
          link: ROUTES.subject.list(),
        },
        {
          label: 'Questions',
          link: ROUTES.question.list(),
        },
      );
    }

    items.push({
      label: 'A propos',
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

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  goHome() {
    this.router.navigate(ROUTES.home());
  }
}
