import type {UiText} from './types';

export const IT: UiText = {
  topmenu: {quiz: 'Quiz', domains: 'Domini', subjects: 'Argomenti', questions: 'Domande', users: 'Utenti', features: 'Funzionalità', donate: 'Sostieni', about: 'Informazioni', alertsAria: 'Messaggi', currentDomain: 'Dominio corrente', ownedDomains: 'I miei domini', managedDomains: 'Domini che gestisco', linkedDomains: 'Domini collegati', noDomains: 'Nessun dominio', preferences: 'Preferenze', notificationsAria: 'Notifiche', lmsMyProgress: 'I miei progressi', lmsMyCertificates: 'I miei certificati', coursesMenu: 'Corsi', coursesMenuFormations: 'Formazioni', quizMenu: 'Quiz', quizMenuLabel: 'Quiz', dashboard: 'Cruscotto'},
  userMenu: {preferences: 'Preferenze', changePassword: 'Cambia password', logout: 'Disconnetti', login: 'Accedi', myInvitations: 'I miei inviti', userFallback: 'Utente'},
  footer: {baseline: 'Piattaforma per quiz e gestione contenuti per dominio.', version: 'Versione', privacyLink: 'Privacy'},
  home: {
    eyebrow: 'Quiz, template e revisione',
    lead: 'Uno spazio unico per creare quiz, assegnarli, completarli e rivedere i risultati.',
    primaryLoggedIn: 'Vedi i miei quiz',
    primaryLoggedOut: 'Accedi',
    secondaryAdmin: 'Crea un template',
    secondaryLoggedOut: 'Crea un account',
    mode: 'Modalita',
    modeManager: 'Gestore',
    modeUser: 'Utente autenticato',
    modeVisitor: 'Visitatore',
    languages: 'Lingue',
    features: 'Funzionalita',
    featuresValue: 'Quiz, messaggi, assegnazioni, revisione',
    contactCta: 'Contattami',
    moderationTileTitle: 'Richieste da moderare',
    moderationTileSubtitle: (total) => `${total} in attesa nei tuoi domini.`,
    moderationTileCount: (n) => n <= 1 ? `${n} richiesta` : `${n} richieste`,
  },
  login: {
    eyebrow: 'Accesso', title: 'Accedi al tuo spazio', subtitle: 'Autenticati per continuare.',
    username: 'Utente', usernamePlaceholder: 'Il tuo nome utente', usernameError: 'Nome utente obbligatorio (min. 3 caratteri)',
    password: 'Password', passwordPlaceholder: 'La tua password', passwordError: 'Password obbligatoria (min. 4 caratteri)',
    remember: 'Ricordami', forgotPassword: 'Password dimenticata?', submit: 'Accedi', noAccount: 'Nessun account?',
    createAccount: 'Crea account', invalidCredentials: 'Credenziali non valide. Riprova.', confirmEmailRequired: 'Conferma il tuo indirizzo email prima di accedere.', orSeparator: 'oppure', magicLinkSwitch: 'Accedi con un link magico', magicLinkBackToPassword: 'Usa una password', magicLinkEmail: 'E-mail', magicLinkEmailPlaceholder: 'tua@email.com', magicLinkSubmit: 'Invia il link', magicLinkSent: 'Se un account esiste, ti è stato inviato un link di accesso per e-mail.', magicLinkError: 'Impossibile inviare il link. Riprova.', magicLinkExchanging: 'Accesso in corso…', magicLinkExchangeFailed: 'Link non valido o già usato.', magicLinkExpired: 'Link scaduto. Richiedine uno nuovo.',
  },
  register: {
    title: 'Crea un account', subtitle: 'Identita, lingua e sicurezza', back: 'Indietro', create: 'Crea', loading: 'Caricamento...',
    identityTitle: 'Identita', identityBadge: 'profilo', securityTitle: 'Sicurezza', securityBadge: 'password',
    username: 'Nome utente', email: 'Indirizzo email', firstName: 'Nome', lastName: 'Cognome', language: 'Lingua',
    domains: 'Domini', chooseDomains: 'Scegli uno o piu domini', domainsHint: 'Seleziona i domini a cui vuoi essere collegato.',
    chooseLanguage: 'Scegli una lingua', password: 'Password', confirmPassword: 'Conferma password', createAccount: 'Crea il mio account',
    cancel: 'Annulla', usernameRequired: 'Il nome utente e obbligatorio.', emailRequired: 'L’indirizzo email e obbligatorio.', emailInvalid: 'L’indirizzo email non e valido.',
    firstNameRequired: 'Il nome e obbligatorio.', lastNameRequired: 'Il cognome e obbligatorio.', languageRequired: 'La lingua e obbligatoria.',
    passwordRequired: 'La password e obbligatoria.', passwordMin: 'Minimo 8 caratteri.', confirmRequired: 'La conferma e obbligatoria.',
    passwordMismatch: 'Le password non corrispondono.', success: 'Il tuo account e stato creato. Controlla la casella email per confermare la registrazione.',
    loadLanguagesError: 'Impossibile caricare le lingue.', loadDomainsError: 'Impossibile caricare i domini.', submitError: 'Registrazione fallita. Controlla i dati e riprova.',
  },
  registerPending: {
    title: 'Account creato',
    subtitle: 'Conferma il tuo indirizzo email',
    lead: 'Il tuo account e stato creato correttamente.',
    body: 'Controlla ora la tua casella email e fai clic sul link di conferma per attivare la registrazione.',
    login: 'Vai al login',
  },
  changePassword: {
    title: 'QuizOnline', subtitle: 'Reimposta la mia password', oldPassword: 'Password attuale', newPassword: 'Nuova password',
    confirmNewPassword: 'Conferma nuova password', oldPasswordRequired: 'La password attuale e obbligatoria.', newPasswordRequired: 'La nuova password e obbligatoria.',
    newPasswordMin: 'La nuova password deve contenere almeno 8 caratteri.', confirmRequired: 'La conferma e obbligatoria.', mismatch: 'Le password non corrispondono.',
    submit: 'Cambia password', forceMessage: 'Devi cambiare la password prima di continuare.', success: 'La tua password e stata modificata.',
    error: 'Si e verificato un errore durante la modifica della password.',
  },
  resetPassword: {
    title: 'Reimposta la password',
    loading: 'Caricamento…',
    emailLabel: 'E-mail',
    emailPlaceholder: 'il tuo indirizzo e-mail',
    emailRequired: 'L\'e-mail è obbligatoria.',
    emailInvalid: 'L\'indirizzo e-mail non è valido.',
    emailHint: 'Verrà inviato un link di reimpostazione se l\'indirizzo e-mail esiste.',
    successMessage: 'Se esiste un account con questo indirizzo, è stata inviata un\'e-mail di reimpostazione.',
    errorGeneric: 'Si è verificato un errore. Riprova più tardi.',
    formInvalid: 'Correggi gli errori nel modulo.',
    confirm: {
      title: 'Nuova password',
      subtitle: 'Scegli una nuova password per il tuo account.',
      confirmPassword: 'Conferma password',
      backToLogin: 'Torna ad accedere',
      linkInvalidOrIncomplete: 'Link di reimpostazione non valido o incompleto.',
      linkInvalidOrExpired: 'Link di reimpostazione non valido o scaduto.',
      successReset: 'La password è stata reimpostata. Ora puoi accedere.',
      errorGeneric: 'Impossibile reimpostare la password.',
    },
  },
  confirmEmail: {
    title: 'Conferma e-mail',
    subtitle: 'Convalida della tua registrazione',
    inProgress: 'Conferma in corso…',
    successFallback: 'Indirizzo e-mail confermato con successo.',
    errorFallback: 'Impossibile confermare questo indirizzo e-mail.',
    invalidLink: 'Link di conferma non valido o incompleto.',
  },
  preferences: {
    eyebrow: 'Il mio account', title: 'Preferenze', subtitle: 'Gestisci il tuo profilo, la lingua dell’interfaccia e il dominio corrente.',
    profileTitle: 'Profilo', profileSubtitle: 'Informazioni personali e preferenze di visualizzazione.', summaryTitle: 'Riepilogo',
    summarySubtitle: 'Vista rapida del tuo account corrente.', loading: 'Caricamento...', username: 'Nome utente', email: 'Email',
    firstName: 'Nome', lastName: 'Cognome', language: 'Lingua', domains: 'Domini collegati', chooseDomains: 'Scegli i domini collegati', currentDomain: 'Dominio corrente', chooseLanguage: 'Scegli una lingua',
    noDomain: 'Nessun dominio', save: 'Salva', changePassword: 'Cambia password', role: 'Ruolo', user: 'Utente', currentDomainLabel: 'Dominio attuale',
    managedDomains: 'Domini gestiti', ownedDomains: 'Domini posseduti', activeAccount: 'Account attivo', yes: 'Si', no: 'No',
    roleSuperuser: 'Superuser', roleManager: 'Gestore', roleUser: 'Utente', roleOwner: 'Proprietario', roleMember: 'Membro collegato', domainsTitle: 'Domini', domainsSubtitle: 'Gestisci i domini collegati e scegli quello corrente.', linkedDomainsList: 'Domini visibili', currentBadge: 'Corrente', setCurrent: 'Imposta corrente', unlinkDomain: 'Esci', addDomain: 'Collega un dominio', noMoreDomains: 'Nessun altro dominio disponibile.', linkSelectedDomains: 'Collega selezione', cancel: 'Annulla', ownerLabel: 'Proprietario:', deleteDomain: 'Elimina', deleteDomainSuccess: 'Dominio eliminato.', deleteDomainError: 'Impossibile eliminare questo dominio.', loadError: 'Impossibile caricare le preferenze.',
    saveError: 'Impossibile salvare le preferenze.', saveSuccess: 'Preferenze salvate.', userMissing: 'Utente non trovato.',
    pendingRequestsTitle: 'Le mie richieste in attesa',
    pendingRequestsEmpty: 'Nessuna richiesta in attesa.',
    pendingRequestsRequestedAt: 'Richiesta il',
    pendingRequestsCancel: 'Annulla richiesta',
    tabProfile: 'Profilo',
    tabDomains: 'Domini',
    tabNotifications: 'Notifiche',
    notificationsTitle: 'Notifiche e-mail',
    notificationsSubtitle: 'Scegli quali e-mail ricevere. Le e-mail critiche (conferma registrazione, reimpostazione password, link di accesso) vengono sempre inviate.',
    notificationKindJoinRequestCreated: 'Nuova richiesta di accesso su un dominio che modero',
    notificationKindJoinRequestDecided: 'Decisione (approvata / rifiutata) su una mia richiesta',
    notificationKindJoinRequestExpiry: 'Avviso prima dell\'annullamento automatico di una richiesta in sospeso',
    notificationKindInviteReceived: 'Invito a unirsi a un dominio',
    notificationKindTransferReceived: 'Proposta di trasferimento di proprietà',
    notificationKindQuizAssignment: 'Un quiz mi è stato assegnato',
    notificationKindQuizCompleted: 'Un utente ha completato un mio quiz',
    notificationKindQuizResultAvailable: 'Il mio punteggio su un quiz è disponibile',
    notificationKindQuizDetailAvailable: 'La correzione dettagliata di un quiz è disponibile',
    notificationKindCourseInviteSent: 'Uno dei miei inviti a un corso è stato inviato',
    notificationKindCourseInviteReceived: 'Sono invitato a partecipare a un corso',
    notificationKindCourseInviteAccepted: 'Uno dei miei inviti a un corso è stato accettato',
    notificationKindCourseEnrollmentRequest: 'Nuova richiesta di iscrizione su un corso che modero',
    notificationChannelEmail: 'E-mail',
    notificationChannelWeb: 'Campanella',
    notificationGroupUser: 'Le mie notifiche',
    notificationGroupManager: 'Come gestore',
    notificationGroupOwner: 'Come proprietario',
    notificationsSaved: 'Preferenze di notifica salvate.',
    dangerZoneTitle: 'Zona di pericolo',
    deleteAccountTitle: 'Elimina il mio account',
    deleteAccountDescription: 'Elimina definitivamente il tuo account e tutti i tuoi dati personali. Irreversibile. Se possiedi ancora dei domini, trasferiscili o eliminali prima.',
    deleteAccountCta: 'Elimina il mio account…',
    deleteConfirmHeader: 'Conferma eliminazione',
    deleteConfirmMessage: (username) => `Irreversibile. Per confermare, digita il tuo nome utente ("${username}") qui sotto.`,
    deleteConfirmPlaceholder: 'Nome utente',
    deleteConfirmAccept: 'Elimina definitivamente',
    deleteConfirmCancel: 'Annulla',
    deleteOwnedDomainsBlock: (count) => count <= 1
      ? 'Possiedi ancora un dominio. Trasferiscilo o eliminalo prima di eliminare il tuo account.'
      : `Possiedi ancora ${count} domini. Trasferiscili o eliminali prima di eliminare il tuo account.`,
    deleteSuccess: 'Il tuo account è stato eliminato.',
    deleteError: 'Impossibile eliminare l\'account.',
  },
  notifications: {
    bellTitle: 'Notifiche',
    bellEmpty: 'Nessuna notifica.',
    bellMarkAllRead: 'Segna tutto come letto',
    bellSeeAll: 'Vedi tutte le notifiche',
    pageTitle: 'Notifiche',
    pageSubtitle: 'Tutto quello che succede sui tuoi domini e sui tuoi inviti.',
    filterUnread: 'Non lette',
    filterAll: 'Tutte',
    filterDeleted: 'Cestino',
    empty: 'Niente da mostrare.',
    emptyHint: 'Riceverai una notifica qui non appena succede qualcosa su uno dei tuoi domini o sui tuoi inviti.',
    actionMarkRead: 'Segna come letta',
    actionDelete: 'Elimina',
    relative: (s) => {
      const sec = Math.max(0, Math.round(s));
      if (sec < 60) return 'adesso';
      const m = Math.floor(sec / 60);
      if (m < 60) return `${m} min fa`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h} h fa`;
      const d = Math.floor(h / 24);
      return `${d} g fa`;
    },
    kindLine: (kind, payload) => {
      const dn = String((payload as {domain_name?: string})?.domain_name ?? '');
      const ru = String((payload as {requester_username?: string})?.requester_username ?? '');
      const iu = String((payload as {inviter_username?: string})?.inviter_username ?? '');
      const ii = String((payload as {initiator_username?: string})?.initiator_username ?? '');
      const oc = String((payload as {outcome?: string})?.outcome ?? '');
      switch (kind) {
        case 'domain.join_request.created':
          return `${ru || 'Un utente'} ha chiesto di unirsi a "${dn}".`;
        case 'domain.join_request.decided':
          return oc === 'approved'
            ? `La tua richiesta per "${dn}" è stata approvata.`
            : `La tua richiesta per "${dn}" è stata rifiutata.`;
        case 'domain.join_request.expiry_warning':
          return `La tua richiesta per "${dn}" sta per scadere.`;
        case 'domain.invite.received':
          return `${iu || 'Qualcuno'} ti ha invitato a "${dn}".`;
        case 'domain.transfer.received':
          return `${ii || 'Il proprietario'} ti propone il trasferimento di "${dn}".`;
        case 'quiz.assignment':
          return `Un nuovo quiz "${String((payload as {template_title?: string})?.template_title ?? '')}" ti è stato assegnato.`;
        case 'quiz.completed':
          return `${String((payload as {user_username?: string})?.user_username ?? 'Un utente')} ha appena completato "${String((payload as {template_title?: string})?.template_title ?? '')}".`;
        case 'quiz.result_available':
          return `Il tuo punteggio su "${String((payload as {template_title?: string})?.template_title ?? '')}" è disponibile.`;
        case 'quiz.detail_available':
          return `La correzione dettagliata di "${String((payload as {template_title?: string})?.template_title ?? '')}" è disponibile.`;
        default:
          return kind;
      }
    },
  },
  admin: {
    menuLabel: 'Amministrazione',
    stats: {
      title: 'Statistiche',
      activeUsers: 'Utenti attivi',
      activeDomains: 'Domini attivi',
      activeQuestions: 'Domande attive',
      completedSessions: 'Sessioni completate',
      domain: 'Dominio',
      members: 'Membri',
      managers: 'Gestori',
      questions: 'Domande',
      templates: 'Modelli',
      sessions: 'Sessioni',
      completion: 'Completamento',
    },
    languages: {
      title: 'Gestione delle lingue',
      addLanguage: 'Aggiungi una lingua',
      code: 'Codice',
      name: 'Nome',
      active: 'Attiva',
      editLanguage: 'Modifica lingua',
      deleteConfirm: 'Sei sicuro di voler eliminare questa lingua?',
      actions: 'Azioni',
    },
    mailTest: {
      title: 'Test email',
      eyebrow: 'SMTP / Outbox',
      subtitle: 'Invia un messaggio di prova attraverso il flusso email reale del backend.',
      formTitle: 'Invia una email di test',
      formSubtitle: 'Il backend accoda il messaggio nell’outbox e avvia la consegna standard.',
      to: 'Destinatario',
      toPlaceholder: 'destinatario@example.com',
      toRequired: "L'indirizzo email è obbligatorio.",
      toInvalid: "L'indirizzo email non è valido.",
      subject: 'Oggetto',
      subjectPlaceholder: 'Lascia vuoto per usare l’oggetto predefinito',
      subjectHint: 'Opzionale. Se vuoto, il backend genera un oggetto di test.',
      body: 'Messaggio',
      bodyPlaceholder: 'Lascia vuoto per usare il contenuto predefinito',
      bodyHint: 'Opzionale. Se vuoto, il backend genera un corpo con timestamp.',
      send: 'Invia test',
      sending: 'Invio...',
      successTitle: 'Email accodata',
      errorTitle: 'Invio fallito',
      errorFallback: 'Impossibile inviare l’email di test.',
      resultTitle: 'Ultimo invio',
      resultSubtitle: 'Risposta immediata dell’API dopo l’accodamento.',
      resultEmpty: 'Nessuna email di test inviata in questa sessione.',
      emailId: 'ID outbox',
      recipients: 'Destinatari',
      deliveryNote: 'Se broker o SMTP non sono disponibili, il messaggio può restare in coda o essere consegnato in modalità degradata a seconda della configurazione backend.',
    },
    systemConfig: {
      title: 'Configurazione di sistema',
      eyebrow: 'Diagnostica',
      subtitle: 'Vista in sola lettura della configurazione runtime effettiva con controlli su richiesta.',
      loading: 'Caricamento configurazione...',
      checking: 'Verifica...',
      checkedAt: 'Verificato il',
      checkResultTitle: 'Risultato del controllo',
      errorTitle: 'Errore di sistema',
      loadError: 'Impossibile caricare la configurazione di sistema.',
      checkError: 'Impossibile eseguire questo controllo.',
      sections: {
        db: {
          title: 'Database',
          description: 'Motore, destinazione e impostazioni di connessione con mascheramento.',
          check: 'Test DB',
          fields: {engine: 'Motore', name: 'Nome', host: 'Host', port: 'Porta', conn_max_age: 'Conn max age'},
        },
        email: {
          title: 'Email',
          description: 'Backend email, mittente e dipendenze di consegna.',
          check: 'Test email',
          fields: {
            backend: 'Backend',
            host: 'Host',
            port: 'Porta',
            use_tls: 'TLS',
            host_user: 'Utente',
            host_password_configured: 'Password configurata',
            default_from_email: 'From',
            celery_broker_url: 'Celery broker',
            celery_result_backend: 'Result backend',
          },
        },
        upload: {
          title: 'Upload',
          description: 'Directory media e limiti backend attivi per gli upload.',
          check: 'Test scrittura',
          fields: {
            media_root: 'Media root',
            media_root_exists: 'Directory presente',
            data_upload_max_memory_size: 'Data upload max',
            file_upload_max_memory_size: 'File upload max',
            max_upload_file_size: 'Dimensione max file',
          },
        },
        deepl: {
          title: 'DeepL',
          description: 'Stato di attivazione e presenza della chiave senza esporre il segreto.',
          check: 'Test DeepL',
          fields: {enabled: 'Attivo', auth_key_configured: 'Chiave configurata', is_free: 'Piano free'},
        },
      },
    },
    joinRequests: {
      title: 'Richieste di accesso',
      user: 'Utente',
      email: 'Email',
      requestedAt: 'Richiesto il',
      status: 'Stato',
      actions: 'Azioni',
      approve: 'Approva',
      reject: 'Rifiuta',
      rejectReason: 'Motivo del rifiuto',
      rejectReasonPlaceholder: 'Indica il motivo del rifiuto…',
      pending: 'In attesa',
      approved: 'Approvata',
      rejected: 'Rifiutata',
      cancelled: 'Annullata',
      all: 'Tutte',
      noRequests: 'Nessuna richiesta.',
      moderate: 'Modera le richieste di accesso',
      decidedBy: 'Deciso da',
      decidedAt: 'Deciso il',
      reason: 'Motivo',
      noReason: '—',
      bulkPlaceholder: 'Azioni in blocco…',
      bulkApply: 'Applica',
      bulkApprove: 'Approva la selezione',
      bulkReject: 'Rifiuta la selezione',
      bulkCancel: 'Annulla',
      bulkSelectedCount: (n) => `${n} selezionat${n <= 1 ? 'a' : 'e'}`,
      bulkRejectHeader: 'Rifiuta più richieste',
      bulkRejectMessage: (n) => `Il motivo qui sotto sarà salvato per le ${n} richieste rifiutate.`,
      bulkActionFailed: 'Una o più azioni non sono riuscite.',
      bulkResultTitle: 'Azione in blocco completata',
      bulkResultDetail: (processed, skipped) => skipped > 0
        ? `${processed} richiesta/e elaborata/e, ${skipped} ignorata/e (già decisa/e o fuori ambito).`
        : `${processed} richiesta/e elaborata/e.`,
    },
  },
  a11y: {
    skipToContent: 'Vai al contenuto principale',
  },
};

