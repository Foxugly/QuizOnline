import {LanguageEnumDto} from '../../api/generated/model/language-enum';

export type UiText = {
  topmenu: {
    quiz: string;
    domains: string;
    subjects: string;
    questions: string;
    about: string;
    alertsAria: string;
  };
  userMenu: {
    preferences: string;
    changePassword: string;
    logout: string;
    login: string;
  };
  footer: {
    baseline: string;
    version: string;
  };
  home: {
    eyebrow: string;
    lead: string;
    primaryLoggedIn: string;
    primaryLoggedOut: string;
    secondaryAdmin: string;
    secondaryLoggedOut: string;
    mode: string;
    modeStaff: string;
    modeUser: string;
    modeVisitor: string;
    languages: string;
    features: string;
    featuresValue: string;
    highlights: Array<{title: string; description: string;}>;
    capabilitiesTitle: string;
    capabilities: string[];
    quickLinksTitle: string;
    quickLinks: {
      catalog: string;
      preferences: string;
      about: string;
    };
  };
  login: {
    eyebrow: string;
    title: string;
    subtitle: string;
    username: string;
    usernamePlaceholder: string;
    usernameError: string;
    password: string;
    passwordPlaceholder: string;
    passwordError: string;
    remember: string;
    forgotPassword: string;
    submit: string;
    noAccount: string;
    createAccount: string;
    invalidCredentials: string;
    confirmEmailRequired: string;
  };
  register: {
    title: string;
    subtitle: string;
    back: string;
    create: string;
    loading: string;
    identityTitle: string;
    identityBadge: string;
    securityTitle: string;
    securityBadge: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    language: string;
    chooseLanguage: string;
    password: string;
    confirmPassword: string;
    createAccount: string;
    cancel: string;
    usernameRequired: string;
    emailRequired: string;
    emailInvalid: string;
    firstNameRequired: string;
    lastNameRequired: string;
    languageRequired: string;
    passwordRequired: string;
    passwordMin: string;
    confirmRequired: string;
    passwordMismatch: string;
    success: string;
    loadLanguagesError: string;
    submitError: string;
  };
  changePassword: {
    title: string;
    subtitle: string;
    oldPassword: string;
    newPassword: string;
    confirmNewPassword: string;
    oldPasswordRequired: string;
    newPasswordRequired: string;
    newPasswordMin: string;
    confirmRequired: string;
    mismatch: string;
    submit: string;
    forceMessage: string;
    success: string;
    error: string;
  };
  preferences: {
    eyebrow: string;
    title: string;
    subtitle: string;
    profileTitle: string;
    profileSubtitle: string;
    summaryTitle: string;
    summarySubtitle: string;
    loading: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    language: string;
    currentDomain: string;
    chooseLanguage: string;
    noDomain: string;
    save: string;
    changePassword: string;
    role: string;
    user: string;
    currentDomainLabel: string;
    managedDomains: string;
    ownedDomains: string;
    activeAccount: string;
    yes: string;
    no: string;
    roleSuperuser: string;
    roleStaff: string;
    roleUser: string;
    loadError: string;
    saveError: string;
    saveSuccess: string;
    userMissing: string;
  };
};

const FR: UiText = {
  topmenu: {
    quiz: 'Quiz',
    domains: 'Domaines',
    subjects: 'Sujets',
    questions: 'Questions',
    about: 'A propos',
    alertsAria: 'Alertes',
  },
  userMenu: {
    preferences: 'Preferences',
    changePassword: 'Changer le mot de passe',
    logout: 'Deconnexion',
    login: 'Connexion',
  },
  footer: {
    baseline: 'Plateforme de quiz et de gestion de contenu par domaine.',
    version: 'Version',
  },
  home: {
    eyebrow: 'Quiz, templates et correction',
    lead: 'Un espace unique pour composer des quiz, les assigner, les passer et suivre les retours.',
    primaryLoggedIn: 'Voir mes quiz',
    primaryLoggedOut: 'Se connecter',
    secondaryAdmin: 'Composer un template',
    secondaryLoggedOut: 'Creer un compte',
    mode: 'Mode',
    modeStaff: 'Staff',
    modeUser: 'Utilisateur connecte',
    modeVisitor: 'Visiteur',
    languages: 'Langues',
    features: 'Fonctions',
    featuresValue: 'Quiz, alertes, affectations, correction',
    highlights: [
      {title: 'Passage fluide', description: 'Quiz pratiques ou examens avec timer, reprise et correction localisee.'},
      {title: 'Edition staff', description: 'Questions multimedia, sujets, domaines et templates dans une interface unifiee.'},
      {title: 'Suivi reel', description: 'Affectations, resultats, alertes et corrections disponibles selon les regles metier.'},
    ],
    capabilitiesTitle: 'Ce que vous pouvez faire',
    capabilities: [
      'Creer et organiser des banques de questions par domaine et sujet.',
      'Composer des quiz pratiques ou examens avec regles de visibilite.',
      'Assigner un quiz a des utilisateurs et suivre leurs resultats.',
      'Relire une session en correction avec bonnes reponses et explications.',
    ],
    quickLinksTitle: 'Acces rapides',
    quickLinks: {
      catalog: 'Catalogue des quiz',
      preferences: 'Preferences',
      about: 'A propos',
    },
  },
  login: {
    eyebrow: 'Connexion',
    title: 'Acceder a votre espace',
    subtitle: 'Identifiez-vous pour continuer.',
    username: 'Utilisateur',
    usernamePlaceholder: 'Votre identifiant',
    usernameError: 'Nom d utilisateur requis (min. 3 caracteres)',
    password: 'Mot de passe',
    passwordPlaceholder: 'Votre mot de passe',
    passwordError: 'Mot de passe requis (min. 4 caracteres)',
    remember: 'Se souvenir de moi',
    forgotPassword: 'Mot de passe oublie ?',
    submit: 'Se connecter',
    noAccount: 'Pas encore de compte ?',
    createAccount: 'Creer un compte',
    invalidCredentials: 'Identifiants invalides. Reessaie.',
    confirmEmailRequired: 'Confirme ton adresse email avant de te connecter.',
  },
  register: {
    title: 'Creer un compte',
    subtitle: 'Identite, langue et securite',
    back: 'Retour',
    create: 'Creer',
    loading: 'Chargement...',
    identityTitle: 'Identite',
    identityBadge: 'profil',
    securityTitle: 'Securite',
    securityBadge: 'mot de passe',
    username: "Nom d'utilisateur",
    email: 'Adresse e-mail',
    firstName: 'Prenom',
    lastName: 'Nom',
    language: 'Langue',
    chooseLanguage: 'Choisir une langue',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    createAccount: 'Creer mon compte',
    cancel: 'Annuler',
    usernameRequired: "Nom d'utilisateur obligatoire.",
    emailRequired: "L'adresse e-mail est obligatoire.",
    emailInvalid: "L'adresse e-mail n'est pas valide.",
    firstNameRequired: 'Le prenom est obligatoire.',
    lastNameRequired: 'Le nom est obligatoire.',
    languageRequired: 'La langue est obligatoire.',
    passwordRequired: 'Le mot de passe est obligatoire.',
    passwordMin: 'Minimum 8 caracteres.',
    confirmRequired: 'La confirmation est obligatoire.',
    passwordMismatch: 'Les mots de passe ne correspondent pas.',
    success: 'Votre compte a ete cree. Verifiez votre boite mail pour confirmer votre inscription.',
    loadLanguagesError: 'Impossible de charger la liste des langues.',
    submitError: "L'inscription a echoue. Verifiez les informations et reessayez.",
  },
  changePassword: {
    title: 'WpRef',
    subtitle: 'Reinitialiser mon mot de passe',
    oldPassword: 'Mot de passe actuel',
    newPassword: 'Nouveau mot de passe',
    confirmNewPassword: 'Confirmer le nouveau mot de passe',
    oldPasswordRequired: 'Le mot de passe actuel est obligatoire.',
    newPasswordRequired: 'Le nouveau mot de passe est obligatoire.',
    newPasswordMin: 'Le nouveau mot de passe doit contenir au moins 8 caracteres.',
    confirmRequired: 'La confirmation est obligatoire.',
    mismatch: 'Les mots de passe ne correspondent pas.',
    submit: 'Changer le mot de passe',
    forceMessage: 'Le changement de mot de passe est requis avant de continuer.',
    success: 'Votre mot de passe a ete modifie.',
    error: 'Une erreur est survenue lors de la modification du mot de passe.',
  },
  preferences: {
    eyebrow: 'Mon compte',
    title: 'Preferences',
    subtitle: 'Gerez votre profil, votre langue d interface et votre domaine courant.',
    profileTitle: 'Profil',
    profileSubtitle: 'Informations personnelles et preferences d affichage.',
    summaryTitle: 'Resume',
    summarySubtitle: 'Vue rapide de votre compte courant.',
    loading: 'Chargement...',
    username: "Nom d'utilisateur",
    email: 'Email',
    firstName: 'Prenom',
    lastName: 'Nom',
    language: 'Langue',
    currentDomain: 'Domaine courant',
    chooseLanguage: 'Choisir une langue',
    noDomain: 'Aucun domaine',
    save: 'Enregistrer',
    changePassword: 'Changer le mot de passe',
    role: 'Role',
    user: 'Utilisateur',
    currentDomainLabel: 'Domaine actuel',
    managedDomains: 'Domaines geres',
    ownedDomains: 'Domaines possedes',
    activeAccount: 'Compte actif',
    yes: 'Oui',
    no: 'Non',
    roleSuperuser: 'Superuser',
    roleStaff: 'Staff',
    roleUser: 'Utilisateur',
    loadError: 'Impossible de charger vos preferences.',
    saveError: "Impossible d'enregistrer les preferences.",
    saveSuccess: 'Preferences enregistrees.',
    userMissing: 'Utilisateur introuvable.',
  },
};

const EN: UiText = {
  topmenu: {quiz: 'Quizzes', domains: 'Domains', subjects: 'Subjects', questions: 'Questions', about: 'About', alertsAria: 'Alerts'},
  userMenu: {preferences: 'Preferences', changePassword: 'Change password', logout: 'Logout', login: 'Login'},
  footer: {baseline: 'Quiz and domain content management platform.', version: 'Version'},
  home: {
    eyebrow: 'Quizzes, templates and review',
    lead: 'One place to build quizzes, assign them, complete them and review feedback.',
    primaryLoggedIn: 'View my quizzes',
    primaryLoggedOut: 'Sign in',
    secondaryAdmin: 'Create a template',
    secondaryLoggedOut: 'Create an account',
    mode: 'Mode',
    modeStaff: 'Staff',
    modeUser: 'Signed-in user',
    modeVisitor: 'Visitor',
    languages: 'Languages',
    features: 'Features',
    featuresValue: 'Quizzes, alerts, assignments, review',
    highlights: [
      {title: 'Smooth delivery', description: 'Practice and exam flows with timer, resume support and localized review.'},
      {title: 'Staff editing', description: 'Multimedia questions, subjects, domains and templates in one workspace.'},
      {title: 'Live follow-up', description: 'Assignments, results, alerts and review rules in the same product.'},
    ],
    capabilitiesTitle: 'What you can do',
    capabilities: [
      'Build and organize question banks by domain and subject.',
      'Create practice or exam quizzes with visibility rules.',
      'Assign a quiz to users and monitor their results.',
      'Review a session with correct answers and explanations.',
    ],
    quickLinksTitle: 'Quick links',
    quickLinks: {catalog: 'Quiz catalog', preferences: 'Preferences', about: 'About'},
  },
  login: {
    eyebrow: 'Login', title: 'Access your workspace', subtitle: 'Sign in to continue.',
    username: 'Username', usernamePlaceholder: 'Your username', usernameError: 'Username is required (min. 3 characters)',
    password: 'Password', passwordPlaceholder: 'Your password', passwordError: 'Password is required (min. 4 characters)',
    remember: 'Remember me', forgotPassword: 'Forgot password?', submit: 'Sign in', noAccount: 'No account yet?',
    createAccount: 'Create account', invalidCredentials: 'Invalid credentials. Try again.', confirmEmailRequired: 'Confirm your email address before signing in.',
  },
  register: {
    title: 'Create an account', subtitle: 'Identity, language and security', back: 'Back', create: 'Create', loading: 'Loading...',
    identityTitle: 'Identity', identityBadge: 'profile', securityTitle: 'Security', securityBadge: 'password',
    username: 'Username', email: 'Email address', firstName: 'First name', lastName: 'Last name', language: 'Language',
    chooseLanguage: 'Choose a language', password: 'Password', confirmPassword: 'Confirm password', createAccount: 'Create my account',
    cancel: 'Cancel', usernameRequired: 'Username is required.', emailRequired: 'Email address is required.', emailInvalid: 'Email address is not valid.',
    firstNameRequired: 'First name is required.', lastNameRequired: 'Last name is required.', languageRequired: 'Language is required.',
    passwordRequired: 'Password is required.', passwordMin: 'Minimum 8 characters.', confirmRequired: 'Confirmation is required.',
    passwordMismatch: 'Passwords do not match.', success: 'Your account has been created. Check your mailbox to confirm your registration.',
    loadLanguagesError: 'Unable to load languages.', submitError: 'Registration failed. Check the information and try again.',
  },
  changePassword: {
    title: 'WpRef', subtitle: 'Reset my password', oldPassword: 'Current password', newPassword: 'New password',
    confirmNewPassword: 'Confirm new password', oldPasswordRequired: 'Current password is required.', newPasswordRequired: 'New password is required.',
    newPasswordMin: 'The new password must be at least 8 characters long.', confirmRequired: 'Confirmation is required.', mismatch: 'Passwords do not match.',
    submit: 'Change password', forceMessage: 'Password change is required before continuing.', success: 'Your password has been changed.',
    error: 'An error occurred while changing the password.',
  },
  preferences: {
    eyebrow: 'My account', title: 'Preferences', subtitle: 'Manage your profile, interface language and current domain.',
    profileTitle: 'Profile', profileSubtitle: 'Personal information and display preferences.', summaryTitle: 'Summary',
    summarySubtitle: 'Quick view of your current account.', loading: 'Loading...', username: 'Username', email: 'Email',
    firstName: 'First name', lastName: 'Last name', language: 'Language', currentDomain: 'Current domain', chooseLanguage: 'Choose a language',
    noDomain: 'No domain', save: 'Save', changePassword: 'Change password', role: 'Role', user: 'User', currentDomainLabel: 'Current domain',
    managedDomains: 'Managed domains', ownedDomains: 'Owned domains', activeAccount: 'Active account', yes: 'Yes', no: 'No',
    roleSuperuser: 'Superuser', roleStaff: 'Staff', roleUser: 'User', loadError: 'Unable to load your preferences.',
    saveError: 'Unable to save preferences.', saveSuccess: 'Preferences saved.', userMissing: 'User not found.',
  },
};

const NL: UiText = {
  topmenu: {quiz: 'Quizzen', domains: 'Domeinen', subjects: 'Onderwerpen', questions: 'Vragen', about: 'Over', alertsAria: 'Meldingen'},
  userMenu: {preferences: 'Voorkeuren', changePassword: 'Wachtwoord wijzigen', logout: 'Afmelden', login: 'Aanmelden'},
  footer: {baseline: 'Platform voor quizzen en domeingebaseerd contentbeheer.', version: 'Versie'},
  home: {
    eyebrow: 'Quizzen, templates en correctie',
    lead: 'Een plek om quizzen te bouwen, toe te wijzen, af te leggen en op te volgen.',
    primaryLoggedIn: 'Mijn quizzen bekijken',
    primaryLoggedOut: 'Aanmelden',
    secondaryAdmin: 'Template maken',
    secondaryLoggedOut: 'Account maken',
    mode: 'Modus',
    modeStaff: 'Staff',
    modeUser: 'Aangemelde gebruiker',
    modeVisitor: 'Bezoeker',
    languages: 'Talen',
    features: 'Functies',
    featuresValue: 'Quizzen, meldingen, toewijzingen, correctie',
    highlights: [
      {title: 'Vlotte afname', description: 'Oefen- en examenflows met timer, hervatten en gelokaliseerde correctie.'},
      {title: 'Staff editing', description: 'Multimediavragen, onderwerpen, domeinen en templates in een werkruimte.'},
      {title: 'Live opvolging', description: 'Toewijzingen, resultaten, meldingen en correctieregels in hetzelfde product.'},
    ],
    capabilitiesTitle: 'Wat u kunt doen',
    capabilities: [
      'Vraagbanken per domein en onderwerp opbouwen en beheren.',
      'Oefen- of examenquizzen maken met zichtbaarheidsregels.',
      'Een quiz toewijzen aan gebruikers en hun resultaten volgen.',
      'Een sessie herbekijken met juiste antwoorden en uitleg.',
    ],
    quickLinksTitle: 'Snelle links',
    quickLinks: {catalog: 'Quizcatalogus', preferences: 'Voorkeuren', about: 'Over'},
  },
  login: {
    eyebrow: 'Aanmelden', title: 'Toegang tot uw ruimte', subtitle: 'Meld u aan om verder te gaan.',
    username: 'Gebruiker', usernamePlaceholder: 'Uw gebruikersnaam', usernameError: 'Gebruikersnaam is verplicht (min. 3 tekens)',
    password: 'Wachtwoord', passwordPlaceholder: 'Uw wachtwoord', passwordError: 'Wachtwoord is verplicht (min. 4 tekens)',
    remember: 'Onthoud mij', forgotPassword: 'Wachtwoord vergeten?', submit: 'Aanmelden', noAccount: 'Nog geen account?',
    createAccount: 'Account maken', invalidCredentials: 'Ongeldige gegevens. Probeer opnieuw.', confirmEmailRequired: 'Bevestig uw e-mailadres voordat u zich aanmeldt.',
  },
  register: {
    title: 'Account maken', subtitle: 'Identiteit, taal en beveiliging', back: 'Terug', create: 'Maken', loading: 'Laden...',
    identityTitle: 'Identiteit', identityBadge: 'profiel', securityTitle: 'Beveiliging', securityBadge: 'wachtwoord',
    username: 'Gebruikersnaam', email: 'E-mailadres', firstName: 'Voornaam', lastName: 'Achternaam', language: 'Taal',
    chooseLanguage: 'Kies een taal', password: 'Wachtwoord', confirmPassword: 'Bevestig wachtwoord', createAccount: 'Mijn account maken',
    cancel: 'Annuleren', usernameRequired: 'Gebruikersnaam is verplicht.', emailRequired: 'E-mailadres is verplicht.', emailInvalid: 'E-mailadres is ongeldig.',
    firstNameRequired: 'Voornaam is verplicht.', lastNameRequired: 'Achternaam is verplicht.', languageRequired: 'Taal is verplicht.',
    passwordRequired: 'Wachtwoord is verplicht.', passwordMin: 'Minimaal 8 tekens.', confirmRequired: 'Bevestiging is verplicht.',
    passwordMismatch: 'Wachtwoorden komen niet overeen.', success: 'Uw account is aangemaakt. Controleer uw mailbox om uw registratie te bevestigen.',
    loadLanguagesError: 'Kan talen niet laden.', submitError: 'Registratie mislukt. Controleer de gegevens en probeer opnieuw.',
  },
  changePassword: {
    title: 'WpRef', subtitle: 'Mijn wachtwoord resetten', oldPassword: 'Huidig wachtwoord', newPassword: 'Nieuw wachtwoord',
    confirmNewPassword: 'Nieuw wachtwoord bevestigen', oldPasswordRequired: 'Huidig wachtwoord is verplicht.', newPasswordRequired: 'Nieuw wachtwoord is verplicht.',
    newPasswordMin: 'Het nieuwe wachtwoord moet minstens 8 tekens bevatten.', confirmRequired: 'Bevestiging is verplicht.', mismatch: 'Wachtwoorden komen niet overeen.',
    submit: 'Wachtwoord wijzigen', forceMessage: 'U moet eerst uw wachtwoord wijzigen.', success: 'Uw wachtwoord is gewijzigd.',
    error: 'Er is een fout opgetreden bij het wijzigen van het wachtwoord.',
  },
  preferences: {
    eyebrow: 'Mijn account', title: 'Voorkeuren', subtitle: 'Beheer uw profiel, interfacetaal en huidig domein.', profileTitle: 'Profiel',
    profileSubtitle: 'Persoonlijke gegevens en weergavevoorkeuren.', summaryTitle: 'Overzicht', summarySubtitle: 'Snelle weergave van uw huidige account.',
    loading: 'Laden...', username: 'Gebruikersnaam', email: 'E-mail', firstName: 'Voornaam', lastName: 'Achternaam', language: 'Taal',
    currentDomain: 'Huidig domein', chooseLanguage: 'Kies een taal', noDomain: 'Geen domein', save: 'Opslaan', changePassword: 'Wachtwoord wijzigen',
    role: 'Rol', user: 'Gebruiker', currentDomainLabel: 'Huidig domein', managedDomains: 'Beheerde domeinen', ownedDomains: 'Eigen domeinen',
    activeAccount: 'Actief account', yes: 'Ja', no: 'Nee', roleSuperuser: 'Superuser', roleStaff: 'Staff', roleUser: 'Gebruiker',
    loadError: 'Kan uw voorkeuren niet laden.', saveError: 'Kan voorkeuren niet opslaan.', saveSuccess: 'Voorkeuren opgeslagen.', userMissing: 'Gebruiker niet gevonden.',
  },
};

const UI_TEXT: Partial<Record<LanguageEnumDto, UiText>> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
};

export function getUiText(lang: LanguageEnumDto | string | null | undefined): UiText {
  return UI_TEXT[(lang as LanguageEnumDto)] ?? EN;
}
