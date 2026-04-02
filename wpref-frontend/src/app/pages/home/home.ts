import {CommonModule} from '@angular/common';
import {Component, computed, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ButtonModule} from 'primeng/button';

import {ROUTES} from '../../app.routes-paths';
import {AuthService} from '../../services/auth/auth';
import {UserService} from '../../services/user/user';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink, ButtonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  readonly app = window.__APP__!;
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);

  readonly isAuthenticated = computed(() => this.auth.isLoggedIn());
  readonly isAdmin = this.userService.isAdmin;
  readonly primaryCta = computed(() =>
    this.isAuthenticated() ? ROUTES.quiz.list() : ROUTES.auth.login(),
  );
  readonly primaryCtaLabel = computed(() =>
    this.isAuthenticated() ? 'Voir mes quiz' : 'Se connecter',
  );
  readonly secondaryCta = computed(() =>
    this.isAdmin() ? ROUTES.quiz.add() : ROUTES.auth.register(),
  );
  readonly secondaryCtaLabel = computed(() =>
    this.isAdmin() ? 'Composer un template' : 'Creer un compte',
  );

  readonly highlights = [
    {
      title: 'Passage fluide',
      description: 'Quiz pratiques ou examens avec timer, reprise et correction localisee.',
    },
    {
      title: 'Edition staff',
      description: 'Questions multimedia, sujets, domaines et templates dans une interface unifiee.',
    },
    {
      title: 'Suivi reel',
      description: 'Affectations, resultats, alertes et corrections disponibles selon les regles metier.',
    },
  ];

  readonly quickLinks = [
    {label: 'Catalogue des quiz', link: ROUTES.quiz.list()},
    {label: 'Preferences', link: ['/preferences'] as const},
    {label: 'A propos', link: ['/about'] as const},
  ];
}
