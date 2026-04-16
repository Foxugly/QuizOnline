import {LanguageEnumDto} from '../../api/generated/model/language-enum';

export type AboutTechCard = {
  title: string;
  description: string;
  items: string[];
};

export type AboutLegalSection = {
  title: string;
  content: string[];
};

export type AboutUiText = {
  eyebrow: string;
  title: string;
  lead: string;
  viewRepository: string;

  tabs: {
    features: string;
    legal: string;
    technical: string;
  };

  featuresTitle: string;
  featuresIntro: string;
  features: string[];

  legalTitle: string;
  legalIntro: string;
  legalSections: AboutLegalSection[];

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
  eyebrow: 'A propos du projet',
  title: 'QuizOnline',
  lead: 'Plateforme de creation, d\'attribution et de passage de quiz multilingues avec administration des contenus, des domaines et des sessions.',
  viewRepository: 'Voir le repository',

  tabs: {
    features: 'Fonctionnalites',
    legal: 'Mentions legales',
    technical: 'Technique',
  },

  featuresTitle: 'Fonctionnalites',
  featuresIntro: 'Tout ce qu\'il faut pour concevoir, diffuser et suivre vos quiz, dans une seule plateforme.',
  features: [
    'Authentification complete : inscription, confirmation d\'email, connexion securisee et recuperation de mot de passe en quelques clics.',
    'Interface multilingue : chaque utilisateur travaille dans sa langue, la plateforme s\'adapte instantanement.',
    'Organisation par domaines : structurez vos contenus avec proprietaires, gestionnaires et membres, chacun avec les bons droits.',
    'Sujets sur mesure : creez et organisez librement les thematiques de chaque domaine.',
    'Banque de questions riche : redigez vos questions, reponses et explications dans autant de langues que necessaire.',
    'Deux modes de quiz : entrainement libre ou examen chronometre, activables domaine par domaine.',
    'Medias integres : illustrez vos questions avec des videos YouTube en un copier-coller.',
    'Templates de quiz flexibles : combinez mode, duree, calendrier de disponibilite et regles de correction en toute liberte.',
    'Creation express : lancez un quiz en quelques secondes et offrez un parcours de reponse fluide et guide.',
    'Attribution ciblee : assignez un quiz aux bonnes personnes directement depuis le tableau de bord staff.',
    'Suivi en temps reel : visualisez les sessions, les scores et les corrections selon vos propres regles de visibilite.',
    'Messagerie integree : restez informe de chaque evenement lie a vos quiz sans quitter la plateforme.',
  ],

  legalTitle: 'Mentions legales & protection des donnees',
  legalIntro: 'QuizOnline respecte la reglementation europeenne en matiere de protection des donnees personnelles.',
  legalSections: [
    {
      title: 'Responsable du traitement',
      content: [
        'Le responsable du traitement des donnees est l\'administrateur de l\'instance QuizOnline deployee.',
        'Pour toute question relative a vos donnees personnelles, contactez l\'administrateur de votre instance.',
      ],
    },
    {
      title: 'Donnees collectees',
      content: [
        'Donnees d\'identification : nom d\'utilisateur, adresse email, prenom, nom.',
        'Donnees d\'activite : reponses aux quiz, scores, sessions, preferences de langue.',
        'Donnees techniques : journaux de connexion strictement necessaires a la securite.',
      ],
    },
    {
      title: 'Base legale et finalites (RGPD Art. 6)',
      content: [
        'Execution d\'un contrat : gestion de votre compte, passage des quiz et suivi de vos resultats.',
        'Interet legitime : securite de la plateforme, prevention des abus, amelioration du service.',
        'Consentement : envoi de notifications optionnelles (revocable a tout moment).',
      ],
    },
    {
      title: 'Vos droits (RGPD Art. 15-22)',
      content: [
        'Droit d\'acces : obtenir une copie de vos donnees personnelles.',
        'Droit de rectification : corriger des donnees inexactes ou incompletes.',
        'Droit a l\'effacement : demander la suppression de vos donnees.',
        'Droit a la portabilite : recevoir vos donnees dans un format structure et lisible.',
        'Droit d\'opposition : vous opposer au traitement dans certains cas.',
        'Droit de reclamation : introduire une reclamation aupres de votre autorite de controle nationale.',
      ],
    },
    {
      title: 'Conservation des donnees',
      content: [
        'Les donnees de compte sont conservees pendant la duree de votre inscription.',
        'Les donnees de session et de resultats sont conservees tant que le domaine est actif.',
        'A la suppression de votre compte, vos donnees personnelles sont supprimees ou anonymisees dans un delai de 30 jours.',
      ],
    },
    {
      title: 'Securite',
      content: [
        'Les communications sont chiffrees via HTTPS/TLS.',
        'Les mots de passe sont haches avec un algorithme irreversible (PBKDF2).',
        'L\'authentification repose sur des jetons JWT a duree de vie limitee.',
      ],
    },
    {
      title: 'Cookies',
      content: [
        'QuizOnline n\'utilise pas de cookies de tracage ni de cookies publicitaires.',
        'Seuls des cookies techniques strictement necessaires au fonctionnement (session, preference de langue) sont utilises.',
      ],
    },
  ],

  technicalTitle: 'Informations techniques',
  technicalIntro: 'Le projet est organise comme un monorepo avec un frontend Angular, un backend Django REST et un contrat OpenAPI partage.',
  repositoryUrlLabel: 'URL du depot',
  cards: {
    repository: {
      title: 'Repository',
      description: 'Code source, CI et artefacts de contrat dans le meme depot.',
      items: [
        'Monorepo GitHub pour le frontend, le backend et les scripts de synchronisation.',
        'Generation et verification des artefacts OpenAPI en CI.',
        'Workflows GitHub Actions pour les controles automatises.',
      ],
    },
    backend: {
      title: 'Backend',
      description: 'API REST, logique metier et securite applicative.',
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
        'Client API genere depuis OpenAPI',
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

  tabs: {
    features: 'Features',
    legal: 'Legal notice',
    technical: 'Technical',
  },

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

  legalTitle: 'Legal notice & data protection',
  legalIntro: 'QuizOnline complies with European regulations on personal data protection.',
  legalSections: [
    {
      title: 'Data controller',
      content: [
        'The data controller is the administrator of the deployed QuizOnline instance.',
        'For any question regarding your personal data, contact the administrator of your instance.',
      ],
    },
    {
      title: 'Data collected',
      content: [
        'Identification data: username, email address, first name, last name.',
        'Activity data: quiz answers, scores, sessions, language preferences.',
        'Technical data: connection logs strictly necessary for security.',
      ],
    },
    {
      title: 'Legal basis and purposes (GDPR Art. 6)',
      content: [
        'Performance of a contract: managing your account, taking quizzes and tracking your results.',
        'Legitimate interest: platform security, abuse prevention, service improvement.',
        'Consent: sending optional notifications (revocable at any time).',
      ],
    },
    {
      title: 'Your rights (GDPR Art. 15-22)',
      content: [
        'Right of access: obtain a copy of your personal data.',
        'Right to rectification: correct inaccurate or incomplete data.',
        'Right to erasure: request the deletion of your data.',
        'Right to data portability: receive your data in a structured, readable format.',
        'Right to object: object to processing in certain cases.',
        'Right to lodge a complaint: file a complaint with your national supervisory authority.',
      ],
    },
    {
      title: 'Data retention',
      content: [
        'Account data is retained for the duration of your registration.',
        'Session and result data is retained as long as the domain is active.',
        'Upon account deletion, your personal data is deleted or anonymized within 30 days.',
      ],
    },
    {
      title: 'Security',
      content: [
        'Communications are encrypted via HTTPS/TLS.',
        'Passwords are hashed using an irreversible algorithm (PBKDF2).',
        'Authentication relies on short-lived JWT tokens.',
      ],
    },
    {
      title: 'Cookies',
      content: [
        'QuizOnline does not use tracking cookies or advertising cookies.',
        'Only strictly necessary technical cookies (session, language preference) are used.',
      ],
    },
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

  tabs: {
    features: 'Functies',
    legal: 'Juridisch',
    technical: 'Technisch',
  },

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

  legalTitle: 'Juridische informatie & gegevensbescherming',
  legalIntro: 'QuizOnline voldoet aan de Europese regelgeving inzake de bescherming van persoonsgegevens.',
  legalSections: [
    {
      title: 'Verwerkingsverantwoordelijke',
      content: [
        'De verwerkingsverantwoordelijke is de beheerder van de geinstalleerde QuizOnline-instantie.',
        'Neem voor vragen over uw persoonsgegevens contact op met de beheerder van uw instantie.',
      ],
    },
    {
      title: 'Verzamelde gegevens',
      content: [
        'Identificatiegegevens: gebruikersnaam, e-mailadres, voornaam, achternaam.',
        'Activiteitsgegevens: quizantwoorden, scores, sessies, taalvoorkeuren.',
        'Technische gegevens: verbindingslogboeken, strikt noodzakelijk voor beveiliging.',
      ],
    },
    {
      title: 'Rechtsgrond en doeleinden (AVG Art. 6)',
      content: [
        'Uitvoering van een overeenkomst: beheer van uw account, afleggen van quizzen en opvolging van resultaten.',
        'Gerechtvaardigd belang: beveiliging van het platform, misbruikpreventie, verbetering van de dienst.',
        'Toestemming: verzending van optionele meldingen (op elk moment intrekbaar).',
      ],
    },
    {
      title: 'Uw rechten (AVG Art. 15-22)',
      content: [
        'Recht van inzage: een kopie van uw persoonsgegevens verkrijgen.',
        'Recht op rectificatie: onjuiste of onvolledige gegevens corrigeren.',
        'Recht op verwijdering: verzoek tot verwijdering van uw gegevens.',
        'Recht op overdraagbaarheid: uw gegevens ontvangen in een gestructureerd, leesbaar formaat.',
        'Recht van bezwaar: u verzetten tegen verwerking in bepaalde gevallen.',
        'Recht om klacht in te dienen: een klacht indienen bij uw nationale toezichthoudende autoriteit.',
      ],
    },
    {
      title: 'Bewaring van gegevens',
      content: [
        'Accountgegevens worden bewaard gedurende de looptijd van uw registratie.',
        'Sessie- en resultaatgegevens worden bewaard zolang het domein actief is.',
        'Bij verwijdering van uw account worden uw persoonsgegevens binnen 30 dagen verwijderd of geanonimiseerd.',
      ],
    },
    {
      title: 'Beveiliging',
      content: [
        'Communicatie wordt versleuteld via HTTPS/TLS.',
        'Wachtwoorden worden gehasht met een onomkeerbaar algoritme (PBKDF2).',
        'Authenticatie is gebaseerd op JWT-tokens met beperkte levensduur.',
      ],
    },
    {
      title: 'Cookies',
      content: [
        'QuizOnline maakt geen gebruik van tracking- of advertentiecookies.',
        'Alleen strikt noodzakelijke technische cookies (sessie, taalvoorkeur) worden gebruikt.',
      ],
    },
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

  tabs: {
    features: 'Funzionalita',
    legal: 'Note legali',
    technical: 'Tecnico',
  },

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

  legalTitle: 'Note legali e protezione dei dati',
  legalIntro: 'QuizOnline rispetta la normativa europea sulla protezione dei dati personali.',
  legalSections: [
    {
      title: 'Titolare del trattamento',
      content: [
        'Il titolare del trattamento e l\'amministratore dell\'istanza QuizOnline installata.',
        'Per qualsiasi domanda sui dati personali, contattare l\'amministratore della propria istanza.',
      ],
    },
    {
      title: 'Dati raccolti',
      content: [
        'Dati identificativi: nome utente, indirizzo email, nome, cognome.',
        'Dati di attivita: risposte ai quiz, punteggi, sessioni, preferenze linguistiche.',
        'Dati tecnici: registri di connessione strettamente necessari per la sicurezza.',
      ],
    },
    {
      title: 'Base giuridica e finalita (GDPR Art. 6)',
      content: [
        'Esecuzione di un contratto: gestione dell\'account, svolgimento dei quiz e monitoraggio dei risultati.',
        'Interesse legittimo: sicurezza della piattaforma, prevenzione degli abusi, miglioramento del servizio.',
        'Consenso: invio di notifiche opzionali (revocabile in qualsiasi momento).',
      ],
    },
    {
      title: 'I tuoi diritti (GDPR Art. 15-22)',
      content: [
        'Diritto di accesso: ottenere una copia dei tuoi dati personali.',
        'Diritto di rettifica: correggere dati inesatti o incompleti.',
        'Diritto alla cancellazione: richiedere la cancellazione dei tuoi dati.',
        'Diritto alla portabilita: ricevere i tuoi dati in un formato strutturato e leggibile.',
        'Diritto di opposizione: opporsi al trattamento in determinati casi.',
        'Diritto di reclamo: presentare un reclamo presso l\'autorita di controllo nazionale.',
      ],
    },
    {
      title: 'Conservazione dei dati',
      content: [
        'I dati dell\'account sono conservati per la durata della registrazione.',
        'I dati di sessione e risultati sono conservati finche il dominio e attivo.',
        'Alla cancellazione dell\'account, i dati personali vengono eliminati o anonimizzati entro 30 giorni.',
      ],
    },
    {
      title: 'Sicurezza',
      content: [
        'Le comunicazioni sono crittografate tramite HTTPS/TLS.',
        'Le password sono sottoposte a hash con un algoritmo irreversibile (PBKDF2).',
        'L\'autenticazione si basa su token JWT a durata limitata.',
      ],
    },
    {
      title: 'Cookie',
      content: [
        'QuizOnline non utilizza cookie di tracciamento ne cookie pubblicitari.',
        'Vengono utilizzati solo cookie tecnici strettamente necessari (sessione, preferenza linguistica).',
      ],
    },
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

  tabs: {
    features: 'Funciones',
    legal: 'Aviso legal',
    technical: 'Tecnico',
  },

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

  legalTitle: 'Aviso legal y proteccion de datos',
  legalIntro: 'QuizOnline cumple con la normativa europea sobre proteccion de datos personales.',
  legalSections: [
    {
      title: 'Responsable del tratamiento',
      content: [
        'El responsable del tratamiento de datos es el administrador de la instancia QuizOnline desplegada.',
        'Para cualquier consulta sobre sus datos personales, contacte con el administrador de su instancia.',
      ],
    },
    {
      title: 'Datos recogidos',
      content: [
        'Datos de identificacion: nombre de usuario, correo electronico, nombre, apellido.',
        'Datos de actividad: respuestas a cuestionarios, puntuaciones, sesiones, preferencias de idioma.',
        'Datos tecnicos: registros de conexion estrictamente necesarios para la seguridad.',
      ],
    },
    {
      title: 'Base legal y finalidades (RGPD Art. 6)',
      content: [
        'Ejecucion de un contrato: gestion de su cuenta, realizacion de cuestionarios y seguimiento de resultados.',
        'Interes legitimo: seguridad de la plataforma, prevencion de abusos, mejora del servicio.',
        'Consentimiento: envio de notificaciones opcionales (revocable en cualquier momento).',
      ],
    },
    {
      title: 'Sus derechos (RGPD Art. 15-22)',
      content: [
        'Derecho de acceso: obtener una copia de sus datos personales.',
        'Derecho de rectificacion: corregir datos inexactos o incompletos.',
        'Derecho de supresion: solicitar la eliminacion de sus datos.',
        'Derecho a la portabilidad: recibir sus datos en un formato estructurado y legible.',
        'Derecho de oposicion: oponerse al tratamiento en determinados casos.',
        'Derecho de reclamacion: presentar una reclamacion ante su autoridad de control nacional.',
      ],
    },
    {
      title: 'Conservacion de datos',
      content: [
        'Los datos de cuenta se conservan durante el periodo de su registro.',
        'Los datos de sesion y resultados se conservan mientras el dominio este activo.',
        'Al eliminar su cuenta, sus datos personales se eliminan o anonimizan en un plazo de 30 dias.',
      ],
    },
    {
      title: 'Seguridad',
      content: [
        'Las comunicaciones se cifran mediante HTTPS/TLS.',
        'Las contrasenas se almacenan con un algoritmo de hash irreversible (PBKDF2).',
        'La autenticacion se basa en tokens JWT de vida limitada.',
      ],
    },
    {
      title: 'Cookies',
      content: [
        'QuizOnline no utiliza cookies de rastreo ni cookies publicitarias.',
        'Solo se utilizan cookies tecnicas estrictamente necesarias (sesion, preferencia de idioma).',
      ],
    },
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
