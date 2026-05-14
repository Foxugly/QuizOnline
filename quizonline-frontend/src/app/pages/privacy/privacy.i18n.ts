import {LanguageEnumDto} from '../../api/generated/model/language-enum';

export type PrivacyUiText = {
  title: string;
  lastUpdated: (date: string) => string;
  intro: string;
  sections: Array<{heading: string; body: string}>;
  rightsHeading: string;
  rightsBody: string;
  exportCta: string;
  exportHint: string;
  contactHeading: string;
  contactBody: (email: string) => string;
};

const FR: PrivacyUiText = {
  title: 'Politique de confidentialité',
  lastUpdated: (date) => `Dernière mise à jour : ${date}`,
  intro:
    'Cette page décrit les données personnelles que QuizOnline collecte, comment elles sont utilisées et les droits dont vous disposez. ' +
    'Elle est volontairement courte et factuelle — n\'hésitez pas à nous contacter pour toute question.',
  sections: [
    {
      heading: 'Données collectées',
      body:
        'Profil utilisateur (nom, adresse e-mail, langue préférée), domaines et quiz auxquels vous participez, ' +
        'préférences de notifications, et journal d\'audit des actions de modération. Les jetons d\'authentification ' +
        'sont stockés localement dans votre navigateur (localStorage / sessionStorage) — strictement nécessaires au fonctionnement du site.',
    },
    {
      heading: 'Utilisation des données',
      body:
        'Strictement pour vous fournir le service : authentification, envoi d\'invitations / notifications, ' +
        'affichage des résultats et statistiques de modération. Aucune donnée n\'est revendue ou partagée avec des tiers ' +
        'à des fins publicitaires.',
    },
    {
      heading: 'Durée de conservation',
      body:
        'Les données sont conservées tant que votre compte est actif. Les sauvegardes de la base de données sont conservées ' +
        '14 jours puis automatiquement purgées.',
    },
    {
      heading: 'Hébergement et sous-traitants',
      body:
        'L\'application est hébergée chez AWS (région européenne). Les e-mails transitent par le fournisseur SMTP configuré ' +
        'par l\'opérateur — aucune donnée n\'est envoyée à des services d\'analyse tiers par défaut.',
    },
  ],
  rightsHeading: 'Vos droits (RGPD)',
  rightsBody:
    'Vous disposez d\'un droit d\'accès, de rectification, de portabilité et d\'effacement de vos données. ' +
    'Pour l\'accès et la portabilité, utilisez le bouton ci-dessous pour télécharger l\'intégralité de vos données ' +
    'au format JSON. Pour l\'effacement, contactez-nous à l\'adresse indiquée plus bas.',
  exportCta: 'Télécharger mes données (JSON)',
  exportHint: 'Génère un fichier ``quizonline-export-<votre nom d\'utilisateur>.json`` contenant profil, domaines, demandes et quiz.',
  contactHeading: 'Contact',
  contactBody: (email) =>
    `Pour toute question liée à la vie privée ou pour demander la suppression de votre compte, écrivez-nous à ${email}.`,
};

const EN: PrivacyUiText = {
  title: 'Privacy policy',
  lastUpdated: (date) => `Last updated: ${date}`,
  intro:
    'This page describes what personal data QuizOnline collects, how it is used and what rights you have. ' +
    'It is intentionally short and factual — reach out with any question.',
  sections: [
    {
      heading: 'Data collected',
      body:
        'User profile (name, e-mail, preferred language), domains and quizzes you participate in, ' +
        'notification preferences, and a moderation audit log. Authentication tokens are stored locally ' +
        'in your browser (localStorage / sessionStorage) — strictly necessary for the site to function.',
    },
    {
      heading: 'Use of data',
      body:
        'Strictly to operate the service: authentication, invitation / notification e-mails, ' +
        'displaying results and moderation analytics. No data is sold or shared with third parties for ' +
        'advertising purposes.',
    },
    {
      heading: 'Retention',
      body:
        'Data is kept while your account is active. Database backups are retained for 14 days and then ' +
        'pruned automatically.',
    },
    {
      heading: 'Hosting and processors',
      body:
        'The application is hosted on AWS (EU region). E-mails go through the SMTP provider configured by ' +
        'the operator — no data is sent to third-party analytics services by default.',
    },
  ],
  rightsHeading: 'Your rights (GDPR)',
  rightsBody:
    'You have the right to access, rectify, port and erase your data. For access and portability, click the ' +
    'button below to download all your data as JSON. For erasure, contact us at the address below.',
  exportCta: 'Download my data (JSON)',
  exportHint: 'Generates a ``quizonline-export-<your username>.json`` file with profile, domains, requests and quizzes.',
  contactHeading: 'Contact',
  contactBody: (email) =>
    `For any privacy-related question or to request account deletion, write to ${email}.`,
};

const NL: PrivacyUiText = {
  title: 'Privacybeleid',
  lastUpdated: (date) => `Laatst bijgewerkt: ${date}`,
  intro:
    'Deze pagina beschrijft welke persoonsgegevens QuizOnline verzamelt, hoe ze worden gebruikt en welke rechten u hebt. ' +
    'Aarzel niet om contact op te nemen bij vragen.',
  sections: [
    {
      heading: 'Verzamelde gegevens',
      body:
        'Gebruikersprofiel (naam, e-mail, voorkeurstaal), domeinen en quizzen waaraan u deelneemt, ' +
        'notificatievoorkeuren en een moderatie-auditlog. Authenticatietokens worden lokaal in uw browser opgeslagen ' +
        '— strikt noodzakelijk voor de werking van de site.',
    },
    {
      heading: 'Gebruik van gegevens',
      body:
        'Uitsluitend om de dienst te leveren: authenticatie, uitnodigingen, resultaten en moderatie. ' +
        'Gegevens worden niet verkocht of gedeeld voor reclamedoeleinden.',
    },
    {
      heading: 'Bewaartermijn',
      body: 'Gegevens worden bewaard zolang uw account actief is. Database-back-ups worden 14 dagen bewaard.',
    },
    {
      heading: 'Hosting en verwerkers',
      body:
        'De toepassing wordt gehost bij AWS (EU-regio). E-mails gaan via de door de operator geconfigureerde SMTP-provider.',
    },
  ],
  rightsHeading: 'Uw rechten (AVG)',
  rightsBody:
    'U hebt het recht op toegang, rectificatie, gegevensoverdraagbaarheid en wissing. Klik op de knop hieronder om al uw ' +
    'gegevens als JSON te downloaden. Voor wissing kunt u ons via onderstaand adres contacteren.',
  exportCta: 'Mijn gegevens downloaden (JSON)',
  exportHint: 'Genereert een bestand ``quizonline-export-<uw gebruikersnaam>.json`` met profiel, domeinen, aanvragen en quizzen.',
  contactHeading: 'Contact',
  contactBody: (email) => `Schrijf ons voor privacy-vragen of accountverwijdering naar ${email}.`,
};

const IT: PrivacyUiText = {
  title: 'Informativa sulla privacy',
  lastUpdated: (date) => `Ultimo aggiornamento: ${date}`,
  intro:
    'Questa pagina descrive quali dati personali QuizOnline raccoglie, come vengono utilizzati e quali diritti hai. ' +
    'Contattaci per qualsiasi domanda.',
  sections: [
    {
      heading: 'Dati raccolti',
      body:
        'Profilo utente (nome, e-mail, lingua preferita), domini e quiz a cui partecipi, preferenze di notifica e ' +
        'registro di audit della moderazione. I token di autenticazione sono salvati nel tuo browser — strettamente necessari.',
    },
    {
      heading: 'Uso dei dati',
      body:
        'Esclusivamente per fornire il servizio: autenticazione, e-mail di invito e notifica, risultati e analisi. ' +
        'Nessun dato è venduto o condiviso con terze parti per scopi pubblicitari.',
    },
    {
      heading: 'Conservazione',
      body: 'I dati sono conservati finché il tuo account è attivo. I backup del database sono conservati 14 giorni.',
    },
    {
      heading: 'Hosting e responsabili',
      body:
        'L\'applicazione è ospitata su AWS (regione UE). Le e-mail passano dal provider SMTP configurato dall\'operatore.',
    },
  ],
  rightsHeading: 'I tuoi diritti (GDPR)',
  rightsBody:
    'Hai diritto di accesso, rettifica, portabilità e cancellazione. Clicca sul pulsante qui sotto per scaricare ' +
    'tutti i tuoi dati in formato JSON. Per la cancellazione, contattaci all\'indirizzo qui sotto.',
  exportCta: 'Scarica i miei dati (JSON)',
  exportHint: 'Genera un file ``quizonline-export-<tuo nome utente>.json`` con profilo, domini, richieste e quiz.',
  contactHeading: 'Contatti',
  contactBody: (email) => `Per qualsiasi domanda sulla privacy o per richiedere la cancellazione, scrivi a ${email}.`,
};

const ES: PrivacyUiText = {
  title: 'Política de privacidad',
  lastUpdated: (date) => `Última actualización: ${date}`,
  intro:
    'Esta página describe qué datos personales recopila QuizOnline, cómo se utilizan y qué derechos tienes. ' +
    'Contáctanos si tienes alguna pregunta.',
  sections: [
    {
      heading: 'Datos recopilados',
      body:
        'Perfil de usuario (nombre, correo electrónico, idioma preferido), dominios y cuestionarios en los que participas, ' +
        'preferencias de notificación y registro de auditoría de moderación. Los tokens de autenticación se guardan localmente ' +
        '— estrictamente necesarios para el funcionamiento del sitio.',
    },
    {
      heading: 'Uso de los datos',
      body:
        'Exclusivamente para prestar el servicio: autenticación, correos de invitación y notificación, resultados y análisis. ' +
        'Ningún dato se vende ni se comparte con terceros con fines publicitarios.',
    },
    {
      heading: 'Conservación',
      body: 'Los datos se conservan mientras tu cuenta esté activa. Las copias de seguridad se conservan 14 días.',
    },
    {
      heading: 'Alojamiento y proveedores',
      body:
        'La aplicación está alojada en AWS (región UE). Los correos pasan por el proveedor SMTP configurado por el operador.',
    },
  ],
  rightsHeading: 'Tus derechos (RGPD)',
  rightsBody:
    'Tienes derecho de acceso, rectificación, portabilidad y supresión. Haz clic en el botón siguiente para descargar ' +
    'todos tus datos en formato JSON. Para la supresión, contáctanos en la dirección indicada más abajo.',
  exportCta: 'Descargar mis datos (JSON)',
  exportHint: 'Genera un archivo ``quizonline-export-<tu nombre de usuario>.json`` con perfil, dominios, solicitudes y cuestionarios.',
  contactHeading: 'Contacto',
  contactBody: (email) => `Para cualquier pregunta sobre privacidad o para solicitar la eliminación de tu cuenta, escríbenos a ${email}.`,
};

const UI_TEXT: Record<LanguageEnumDto, PrivacyUiText> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
  [LanguageEnumDto.It]: IT,
  [LanguageEnumDto.Es]: ES,
};

export function getPrivacyUiText(
  lang: LanguageEnumDto | string | null | undefined,
): PrivacyUiText {
  return UI_TEXT[lang as LanguageEnumDto] ?? FR;
}
