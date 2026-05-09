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
  tabs: {
    company: string;
    legal: string;
    technical: string;
  };

  companyTitle: string;
  companyIntro: string;
  company: {
    contactLabel: string;
    companyLabel: string;
    vatLabel: string;
    addressLabel: string;
    emailLabel: string;
    emailButton: string;
    phoneLabel: string;
    websiteLabel: string;
  };

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
  tabs: {
    company: 'Société',
    legal: 'Mentions légales',
    technical: 'Technique',
  },

  companyTitle: 'Société',
  companyIntro: 'Informations légales et coordonnées de la société qui édite et exploite QuizOnline.',
  company: {
    contactLabel: 'Contact',
    companyLabel: 'Société',
    vatLabel: 'TVA / BCE',
    addressLabel: 'Adresse',
    emailLabel: 'Email',
    emailButton: 'M\'envoyer un email',
    phoneLabel: 'Téléphone',
    websiteLabel: 'Site web',
  },

  legalTitle: 'Mentions légales & protection des données',
  legalIntro: 'QuizOnline respecte la réglementation européenne en matière de protection des données personnelles.',
  legalSections: [
    {
      title: 'Responsable du traitement',
      content: [
        'Le responsable du traitement des données est l\'administrateur de l\'instance QuizOnline déployée.',
        'Pour toute question relative à vos données personnelles, contactez l\'administrateur de votre instance.',
      ],
    },
    {
      title: 'Données collectées',
      content: [
        'Données d\'identification : nom d\'utilisateur, adresse email, prénom, nom.',
        'Données d\'activité : réponses aux quiz, scores, sessions, préférences de langue.',
        'Données techniques : journaux de connexion strictement nécessaires à la sécurité.',
      ],
    },
    {
      title: 'Base légale et finalités (RGPD Art. 6)',
      content: [
        'Exécution d\'un contrat : gestion de votre compte, passage des quiz et suivi de vos résultats.',
        'Intérêt légitime : sécurité de la plateforme, prévention des abus, amélioration du service.',
        'Consentement : envoi de notifications optionnelles (révocable à tout moment).',
      ],
    },
    {
      title: 'Vos droits (RGPD Art. 15-22)',
      content: [
        'Droit d\'accès : obtenir une copie de vos données personnelles.',
        'Droit de rectification : corriger des données inexactes ou incomplètes.',
        'Droit à l\'effacement : demander la suppression de vos données.',
        'Droit à la portabilité : recevoir vos données dans un format structuré et lisible.',
        'Droit d\'opposition : vous opposer au traitement dans certains cas.',
        'Droit de réclamation : introduire une réclamation auprès de votre autorité de contrôle nationale.',
      ],
    },
    {
      title: 'Conservation des données',
      content: [
        'Les données de compte sont conservées pendant la durée de votre inscription.',
        'Les données de session et de résultats sont conservées tant que le domaine est actif.',
        'À la suppression de votre compte, vos données personnelles sont supprimées ou anonymisées dans un délai de 30 jours.',
      ],
    },
    {
      title: 'Sécurité',
      content: [
        'Les communications sont chiffrées via HTTPS/TLS.',
        'Les mots de passe sont hachés avec un algorithme irréversible (PBKDF2).',
        'L\'authentification repose sur des jetons JWT à durée de vie limitée.',
      ],
    },
    {
      title: 'Cookies',
      content: [
        'QuizOnline n\'utilise pas de cookies de traçage ni de cookies publicitaires.',
        'Seuls des cookies techniques strictement nécessaires au fonctionnement (session, préférence de langue) sont utilisés.',
      ],
    },
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
  tabs: {
    company: 'Company',
    legal: 'Legal notice',
    technical: 'Technical',
  },

  companyTitle: 'Company',
  companyIntro: 'Legal information and contact details of the company that operates QuizOnline.',
  company: {
    contactLabel: 'Contact',
    companyLabel: 'Company',
    vatLabel: 'VAT / BCE',
    addressLabel: 'Address',
    emailLabel: 'Email',
    emailButton: 'Send me an email',
    phoneLabel: 'Phone',
    websiteLabel: 'Website',
  },

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
  tabs: {
    company: 'Bedrijf',
    legal: 'Juridisch',
    technical: 'Technisch',
  },

  companyTitle: 'Bedrijf',
  companyIntro: 'Juridische informatie en contactgegevens van het bedrijf dat QuizOnline uitbaat.',
  company: {
    contactLabel: 'Contact',
    companyLabel: 'Bedrijf',
    vatLabel: 'BTW / KBO',
    addressLabel: 'Adres',
    emailLabel: 'E-mail',
    emailButton: 'Stuur mij een e-mail',
    phoneLabel: 'Telefoon',
    websiteLabel: 'Website',
  },

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
  tabs: {
    company: 'Società',
    legal: 'Note legali',
    technical: 'Tecnico',
  },

  companyTitle: 'Società',
  companyIntro: 'Informazioni legali e contatti della società che gestisce QuizOnline.',
  company: {
    contactLabel: 'Contatto',
    companyLabel: 'Società',
    vatLabel: 'P.IVA / BCE',
    addressLabel: 'Indirizzo',
    emailLabel: 'Email',
    emailButton: 'Inviami una email',
    phoneLabel: 'Telefono',
    websiteLabel: 'Sito web',
  },

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
  tabs: {
    company: 'Empresa',
    legal: 'Aviso legal',
    technical: 'Tecnico',
  },

  companyTitle: 'Empresa',
  companyIntro: 'Información legal y datos de contacto de la empresa que opera QuizOnline.',
  company: {
    contactLabel: 'Contacto',
    companyLabel: 'Empresa',
    vatLabel: 'IVA / BCE',
    addressLabel: 'Dirección',
    emailLabel: 'Correo',
    emailButton: 'Enviarme un correo',
    phoneLabel: 'Teléfono',
    websiteLabel: 'Sitio web',
  },

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
