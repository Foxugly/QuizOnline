import {Component} from '@angular/core';

@Component({
  selector: 'app-about',
  imports: [],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {
  protected readonly repositoryUrl = 'https://github.com/Foxugly/WpRef';

  protected readonly frontendStack = [
    'Angular 21',
    'TypeScript',
    'PrimeNG 21',
    'PrimeFlex',
    'RxJS',
    'Playwright',
  ];

  protected readonly backendStack = [
    'Django',
    'Django REST Framework',
    'drf-spectacular',
    'Simple JWT',
    'django-parler',
    'django-filter',
  ];

  protected readonly projectHighlights = [
    'Application de gestion de domaines, sujets, questions et quiz.',
    'Frontend SPA Angular avec pages d’édition, de passage de quiz et d’administration.',
    'Backend API REST Django avec logique métier de session, correction et permissions.',
    'Support multilingue sur les contenus métier et préférences de langue utilisateur.',
  ];
}
