import {LanguageEnumDto} from '../../api/generated/model/language-enum';

export type AboutTechCard = {
  title: string;
  description: string;
  items: string[];
};

export type AboutUiText = {
  eyebrow: string;
  title: string;
  lead: string;
  viewRepository: string;
  featuresTitle: string;
  featuresIntro: string;
  features: string[];
  technicalTitle: string;
  technicalIntro: string;
  repositoryUrlLabel: string;
  cards: {
    repository: AboutTechCard;
    backend: AboutTechCard;
    frontend: AboutTechCard;
  };
};

const FR: AboutUiText = {
  eyebrow: 'À propos du projet',
  title: 'QuizOnline',
  lead: 'Plateforme de création, d\'attribution et de passage de quiz multilingues avec administration des contenus, des domaines et des sessions.',
  viewRepository: 'Voir le repository',
  featuresTitle: 'Fonctionnalités',
  featuresIntro: 'Tout ce qu\'il faut pour concevoir, diffuser et suivre vos quiz, dans une seule plateforme.',
  features: [
    'Authentification complète : inscription, confirmation d\'email, connexion sécurisée et récupération de mot de passe en quelques clics.',
    'Interface multilingue : chaque utilisateur travaille dans sa langue, la plateforme s\'adapte instantanément.',
    'Organisation par domaines : structurez vos contenus avec propriétaires, gestionnaires et membres, chacun avec les bons droits.',
    'Sujets sur mesure : créez et organisez librement les thématiques de chaque domaine.',
    'Banque de questions riche : rédigez vos questions, réponses et explications dans autant de langues que nécessaire.',
    'Deux modes de quiz : entraînement libre ou examen chronométré, activables domaine par domaine.',
    'Médias intégrés : illustrez vos questions avec des vidéos YouTube en un copier-coller.',
    'Templates de quiz flexibles : combinez mode, durée, calendrier de disponibilité et règles de correction en toute liberté.',
    'Création express : lancez un quiz en quelques secondes et offrez un parcours de réponse fluide et guidé.',
    'Attribution ciblée : assignez un quiz aux bonnes personnes directement depuis le tableau de bord staff.',
    'Suivi en temps réel : visualisez les sessions, les scores et les corrections selon vos propres règles de visibilité.',
    'Messagerie intégrée : restez informé de chaque événement lié à vos quiz sans quitter la plateforme.',
  ],
  technicalTitle: 'Informations techniques',
  technicalIntro: 'Le projet est organisé comme un monorepo avec un frontend Angular, un backend Django REST et un contrat OpenAPI partagé.',
  repositoryUrlLabel: 'URL du dépôt',
  cards: {
    repository: {
      title: 'Repository',
      description: 'Code source, CI et artefacts de contrat dans le même dépôt.',
      items: [
        'Monorepo GitHub pour le frontend, le backend et les scripts de synchronisation.',
        'Génération et vérification des artefacts OpenAPI en CI.',
        'Workflows GitHub Actions pour les contrôles automatisés.',
      ],
    },
    backend: {
      title: 'Backend',
      description: 'API REST, logique métier et sécurité applicative.',
      items: [
        'Django et Django REST Framework',
        'drf-spectacular pour le contrat OpenAPI',
        'Simple JWT, django-filter et django-parler',
        'Celery, import-export et tests Python',
      ],
    },
    frontend: {
      title: 'Frontend',
      description: 'SPA d\'administration et de passage de quiz.',
      items: [
        'Angular 21, TypeScript et RxJS',
        'PrimeNG 21, PrimeFlex et PrimeIcons',
        'Client API généré depuis OpenAPI',
        'Karma, Jasmine et Playwright',
      ],
    },
  },
};

const EN: AboutUiText = {
  eyebrow: 'About the project',
  title: 'QuizOnline',
  lead: 'Platform for authoring, assigning and completing multilingual quizzes with content, domain and session administration.',
  viewRepository: 'View repository',
  featuresTitle: 'Features',
  featuresIntro: 'Everything you need to create, deliver and track quizzes, all in one platform.',
  features: [
    'Seamless onboarding: sign up, confirm your email and log in securely, with password recovery just a click away.',
    'Truly multilingual: every user works in their own language, and the interface adapts instantly.',
    'Domain-based organization: structure your content with owners, managers and members, each with the right permissions.',
    'Custom topics: freely create and organize the subjects that matter to each domain.',
    'Rich question bank: author questions, answers and explanations in as many languages as you need.',
    'Two quiz modes: free practice or timed exam, activatable domain by domain.',
    'Embedded media: illustrate your questions with YouTube videos in a single paste.',
    'Flexible quiz templates: mix mode, duration, availability schedule and review rules any way you like.',
    'Express creation: launch a quiz in seconds and deliver a smooth, guided answering experience.',
    'Targeted assignment: send a quiz to the right people straight from the staff dashboard.',
    'Real-time tracking: view sessions, scores and reviews according to your own visibility rules.',
    'Built-in messaging: stay informed of every quiz-related event without leaving the platform.',
  ],
  technicalTitle: 'Technical details',
  technicalIntro: 'The project is organized as a monorepo with an Angular frontend, a Django REST backend and a shared OpenAPI contract.',
  repositoryUrlLabel: 'Repository URL',
  cards: {
    repository: {
      title: 'Repository',
      description: 'Source code, CI and contract artifacts live in the same repository.',
      items: [
        'GitHub monorepo for frontend, backend and synchronization scripts.',
        'OpenAPI artifact generation and verification in CI.',
        'GitHub Actions workflows for automated checks.',
      ],
    },
    backend: {
      title: 'Backend',
      description: 'REST API, business rules and application security.',
      items: [
        'Django and Django REST Framework',
        'drf-spectacular for the OpenAPI contract',
        'Simple JWT, django-filter and django-parler',
        'Celery, import-export and Python tests',
      ],
    },
    frontend: {
      title: 'Frontend',
      description: 'Single-page app for administration and quiz delivery.',
      items: [
        'Angular 21, TypeScript and RxJS',
        'PrimeNG 21, PrimeFlex and PrimeIcons',
        'API client generated from OpenAPI',
        'Karma, Jasmine and Playwright',
      ],
    },
  },
};

const NL: AboutUiText = {
  eyebrow: 'Over het project',
  title: 'QuizOnline',
  lead: 'Platform voor het opstellen, toewijzen en afleggen van meertalige quizzen met beheer van content, domeinen en sessies.',
  viewRepository: 'Repository bekijken',
  featuresTitle: 'Functies',
  featuresIntro: 'Alles wat u nodig hebt om quizzen te maken, af te nemen en op te volgen, in een enkel platform.',
  features: [
    'Vlotte start: registreer, bevestig uw e-mail en log veilig in, met wachtwoordherstel op een klik afstand.',
    'Echt meertalig: elke gebruiker werkt in zijn eigen taal, de interface past zich direct aan.',
    'Domeingerichte structuur: organiseer uw inhoud met eigenaars, beheerders en leden, elk met de juiste rechten.',
    'Onderwerpen op maat: maak en organiseer vrij de thema\'s van elk domein.',
    'Rijke vragenbank: stel vragen, antwoorden en uitleg op in zoveel talen als nodig.',
    'Twee quizmodi: vrij oefenen of getimed examen, activeerbaar per domein.',
    'Embedded media: illustreer uw vragen met YouTube-video\'s door simpelweg te plakken.',
    'Flexibele quiztemplates: combineer modus, duur, beschikbaarheid en correctieregels geheel naar wens.',
    'Snel aanmaken: start een quiz in enkele seconden en bied een vlot, begeleid antwoordtraject.',
    'Gerichte toewijzing: stuur een quiz naar de juiste personen rechtstreeks vanuit het staffdashboard.',
    'Realtime opvolging: bekijk sessies, scores en correcties volgens uw eigen zichtbaarheidsregels.',
    'Ingebouwde berichten: blijf op de hoogte van elk quizgerelateerd evenement zonder het platform te verlaten.',
  ],
  technicalTitle: 'Technische informatie',
  technicalIntro: 'Het project is opgezet als monorepo met een Angular-frontend, een Django REST-backend en een gedeeld OpenAPI-contract.',
  repositoryUrlLabel: 'Repository-URL',
  cards: {
    repository: {
      title: 'Repository',
      description: 'Broncode, CI en contractartefacten zitten in hetzelfde depot.',
      items: [
        'GitHub-monorepo voor frontend, backend en synchronisatiescripts.',
        'Generatie en controle van OpenAPI-artefacten in CI.',
        'GitHub Actions-workflows voor automatische controles.',
      ],
    },
    backend: {
      title: 'Backend',
      description: 'REST API, bedrijfslogica en applicatieve beveiliging.',
      items: [
        'Django en Django REST Framework',
        'drf-spectacular voor het OpenAPI-contract',
        'Simple JWT, django-filter en django-parler',
        'Celery, import-export en Python-tests',
      ],
    },
    frontend: {
      title: 'Frontend',
      description: 'Single-page app voor beheer en quizafname.',
      items: [
        'Angular 21, TypeScript en RxJS',
        'PrimeNG 21, PrimeFlex en PrimeIcons',
        'API-client gegenereerd uit OpenAPI',
        'Karma, Jasmine en Playwright',
      ],
    },
  },
};

const IT: AboutUiText = {
  eyebrow: 'Informazioni sul progetto',
  title: 'QuizOnline',
  lead: 'Piattaforma per creare, assegnare e completare quiz multilingue con amministrazione di contenuti, domini e sessioni.',
  viewRepository: 'Vedi repository',
  featuresTitle: 'Funzionalita',
  featuresIntro: 'Tutto il necessario per creare, distribuire e monitorare i quiz in un\'unica piattaforma.',
  features: [
    'Onboarding immediato: registrati, conferma la tua email e accedi in sicurezza, con recupero password a portata di clic.',
    'Veramente multilingue: ogni utente lavora nella propria lingua, l\'interfaccia si adatta all\'istante.',
    'Organizzazione per dominio: struttura i contenuti con proprietari, gestori e membri, ciascuno con i permessi giusti.',
    'Argomenti personalizzati: crea e organizza liberamente le tematiche di ogni dominio.',
    'Banca domande completa: redigi domande, risposte e spiegazioni in tutte le lingue necessarie.',
    'Due modalita di quiz: pratica libera o esame cronometrato, attivabili dominio per dominio.',
    'Media integrati: arricchisci le domande con video YouTube con un semplice copia-incolla.',
    'Template flessibili: combina modalita, durata, calendario di disponibilita e regole di revisione in totale liberta.',
    'Creazione express: lancia un quiz in pochi secondi e offri un percorso di risposta fluido e guidato.',
    'Assegnazione mirata: invia un quiz alle persone giuste direttamente dalla dashboard staff.',
    'Monitoraggio in tempo reale: visualizza sessioni, punteggi e revisioni secondo le tue regole di visibilita.',
    'Messaggistica integrata: resta informato su ogni evento legato ai quiz senza uscire dalla piattaforma.',
  ],
  technicalTitle: 'Informazioni tecniche',
  technicalIntro: 'Il progetto e organizzato come monorepo con frontend Angular, backend Django REST e contratto OpenAPI condiviso.',
  repositoryUrlLabel: 'URL del repository',
  cards: {
    repository: {
      title: 'Repository',
      description: 'Codice sorgente, CI e artefatti del contratto nello stesso repository.',
      items: [
        'Monorepo GitHub per frontend, backend e script di sincronizzazione.',
        'Generazione e verifica degli artefatti OpenAPI in CI.',
        'Workflow GitHub Actions per i controlli automatici.',
      ],
    },
    backend: {
      title: 'Backend',
      description: 'API REST, logica di business e sicurezza applicativa.',
      items: [
        'Django e Django REST Framework',
        'drf-spectacular per il contratto OpenAPI',
        'Simple JWT, django-filter e django-parler',
        'Celery, import-export e test Python',
      ],
    },
    frontend: {
      title: 'Frontend',
      description: 'SPA per amministrazione e fruizione dei quiz.',
      items: [
        'Angular 21, TypeScript e RxJS',
        'PrimeNG 21, PrimeFlex e PrimeIcons',
        'Client API generato da OpenAPI',
        'Karma, Jasmine e Playwright',
      ],
    },
  },
};

const ES: AboutUiText = {
  eyebrow: 'Acerca del proyecto',
  title: 'QuizOnline',
  lead: 'Plataforma para crear, asignar y completar cuestionarios multilingues con administracion de contenidos, dominios y sesiones.',
  viewRepository: 'Ver repositorio',
  featuresTitle: 'Funciones',
  featuresIntro: 'Todo lo que necesitas para crear, distribuir y supervisar tus cuestionarios en una sola plataforma.',
  features: [
    'Incorporacion fluida: registrate, confirma tu email e inicia sesion de forma segura, con recuperacion de contrasena a un clic.',
    'Realmente multilingue: cada usuario trabaja en su idioma, la interfaz se adapta al instante.',
    'Organizacion por dominios: estructura tu contenido con propietarios, gestores y miembros, cada uno con los permisos adecuados.',
    'Temas a medida: crea y organiza libremente las tematicas de cada dominio.',
    'Banco de preguntas completo: redacta preguntas, respuestas y explicaciones en tantos idiomas como necesites.',
    'Dos modos de cuestionario: practica libre o examen cronometrado, activables dominio por dominio.',
    'Medios integrados: ilustra tus preguntas con videos de YouTube con un simple copiar y pegar.',
    'Plantillas flexibles: combina modo, duracion, calendario de disponibilidad y reglas de correccion con total libertad.',
    'Creacion express: lanza un cuestionario en segundos y ofrece una experiencia de respuesta fluida y guiada.',
    'Asignacion dirigida: envia un cuestionario a las personas adecuadas directamente desde el panel staff.',
    'Seguimiento en tiempo real: visualiza sesiones, puntuaciones y correcciones segun tus propias reglas de visibilidad.',
    'Mensajeria integrada: mantente al dia de cada evento relacionado con tus cuestionarios sin salir de la plataforma.',
  ],
  technicalTitle: 'Informacion tecnica',
  technicalIntro: 'El proyecto esta organizado como monorepo con frontend Angular, backend Django REST y contrato OpenAPI compartido.',
  repositoryUrlLabel: 'URL del repositorio',
  cards: {
    repository: {
      title: 'Repositorio',
      description: 'Codigo fuente, CI y artefactos del contrato en el mismo repositorio.',
      items: [
        'Monorepo GitHub para frontend, backend y scripts de sincronizacion.',
        'Generacion y verificacion de artefactos OpenAPI en CI.',
        'Workflows de GitHub Actions para controles automatizados.',
      ],
    },
    backend: {
      title: 'Backend',
      description: 'API REST, reglas de negocio y seguridad de la aplicacion.',
      items: [
        'Django y Django REST Framework',
        'drf-spectacular para el contrato OpenAPI',
        'Simple JWT, django-filter y django-parler',
        'Celery, import-export y pruebas Python',
      ],
    },
    frontend: {
      title: 'Frontend',
      description: 'SPA de administracion y ejecucion de cuestionarios.',
      items: [
        'Angular 21, TypeScript y RxJS',
        'PrimeNG 21, PrimeFlex y PrimeIcons',
        'Cliente API generado desde OpenAPI',
        'Karma, Jasmine y Playwright',
      ],
    },
  },
};

const UI_TEXT: Partial<Record<LanguageEnumDto, AboutUiText>> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
  [LanguageEnumDto.It]: IT,
  [LanguageEnumDto.Es]: ES,
};

export function getAboutUiText(lang: LanguageEnumDto | string | null | undefined): AboutUiText {
  return UI_TEXT[lang as LanguageEnumDto] ?? EN;
}
