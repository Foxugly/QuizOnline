import type {UiText} from './types';

export const NL: UiText = {
  topmenu: {quiz: 'Quizzen', domains: 'Domeinen', subjects: 'Onderwerpen', questions: 'Vragen', users: 'Gebruikers', features: 'Functies', donate: 'Doneren', about: 'Over', alertsAria: 'Berichten', currentDomain: 'Huidig domein', ownedDomains: 'Mijn domeinen', managedDomains: 'Domeinen die ik beheer', linkedDomains: 'Gekoppelde domeinen', noDomains: 'Geen domein', preferences: 'Voorkeuren', notificationsAria: 'Meldingen'},
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
    modeManager: 'Beheerder',
    modeUser: 'Aangemelde gebruiker',
    modeVisitor: 'Bezoeker',
    languages: 'Talen',
    features: 'Functies',
    featuresValue: 'Quizzen, meldingen, toewijzingen, correctie',
    contactCta: 'Contact opnemen',
    moderationTileTitle: 'Aanvragen ter goedkeuring',
    moderationTileSubtitle: (total) => `${total} openstaand op uw domeinen.`,
    moderationTileCount: (n) => n <= 1 ? `${n} aanvraag` : `${n} aanvragen`,
  },
  login: {
    eyebrow: 'Aanmelden', title: 'Toegang tot uw ruimte', subtitle: 'Meld u aan om verder te gaan.',
    username: 'Gebruiker', usernamePlaceholder: 'Uw gebruikersnaam', usernameError: 'Gebruikersnaam is verplicht (min. 3 tekens)',
    password: 'Wachtwoord', passwordPlaceholder: 'Uw wachtwoord', passwordError: 'Wachtwoord is verplicht (min. 4 tekens)',
    remember: 'Onthoud mij', forgotPassword: 'Wachtwoord vergeten?', submit: 'Aanmelden', noAccount: 'Nog geen account?',
    createAccount: 'Account maken', invalidCredentials: 'Ongeldige gegevens. Probeer opnieuw.', confirmEmailRequired: 'Bevestig uw e-mailadres voordat u zich aanmeldt.', orSeparator: 'of', magicLinkSwitch: 'Aanmelden via een magische link', magicLinkBackToPassword: 'Een wachtwoord gebruiken', magicLinkEmail: 'E-mailadres', magicLinkEmailPlaceholder: 'uw@email.com', magicLinkSubmit: 'Link verzenden', magicLinkSent: 'Als er een account bestaat, is een aanmeldlink per e-mail verzonden.', magicLinkError: 'Kan de link niet verzenden. Probeer opnieuw.', magicLinkExchanging: 'Bezig met aanmelden…', magicLinkExchangeFailed: 'Ongeldige of al gebruikte link.', magicLinkExpired: 'Link verlopen. Vraag er een nieuwe aan.',
  },
  register: {
    title: 'Account maken', subtitle: 'Identiteit, taal en beveiliging', back: 'Terug', create: 'Maken', loading: 'Laden...',
    identityTitle: 'Identiteit', identityBadge: 'profiel', securityTitle: 'Beveiliging', securityBadge: 'wachtwoord',
    username: 'Gebruikersnaam', email: 'E-mailadres', firstName: 'Voornaam', lastName: 'Achternaam', language: 'Taal',
    domains: 'Domeinen', chooseDomains: 'Kies een of meer domeinen', domainsHint: 'Selecteer de domeinen waaraan u gekoppeld wilt worden.',
    chooseLanguage: 'Kies een taal', password: 'Wachtwoord', confirmPassword: 'Bevestig wachtwoord', createAccount: 'Mijn account maken',
    cancel: 'Annuleren', usernameRequired: 'Gebruikersnaam is verplicht.', emailRequired: 'E-mailadres is verplicht.', emailInvalid: 'E-mailadres is ongeldig.',
    firstNameRequired: 'Voornaam is verplicht.', lastNameRequired: 'Achternaam is verplicht.', languageRequired: 'Taal is verplicht.',
    passwordRequired: 'Wachtwoord is verplicht.', passwordMin: 'Minimaal 8 tekens.', confirmRequired: 'Bevestiging is verplicht.',
    passwordMismatch: 'Wachtwoorden komen niet overeen.', success: 'Uw account is aangemaakt. Controleer uw mailbox om uw registratie te bevestigen.',
    loadLanguagesError: 'Kan talen niet laden.', loadDomainsError: 'Kan domeinen niet laden.', submitError: 'Registratie mislukt. Controleer de gegevens en probeer opnieuw.',
  },
  registerPending: {
    title: 'Account aangemaakt',
    subtitle: 'Bevestig uw e-mailadres',
    lead: 'Uw account is succesvol aangemaakt.',
    body: 'Controleer nu uw mailbox en klik op de bevestigingslink om uw registratie te activeren.',
    login: 'Naar aanmelden',
  },
  changePassword: {
    title: 'QuizOnline', subtitle: 'Mijn wachtwoord resetten', oldPassword: 'Huidig wachtwoord', newPassword: 'Nieuw wachtwoord',
    confirmNewPassword: 'Nieuw wachtwoord bevestigen', oldPasswordRequired: 'Huidig wachtwoord is verplicht.', newPasswordRequired: 'Nieuw wachtwoord is verplicht.',
    newPasswordMin: 'Het nieuwe wachtwoord moet minstens 8 tekens bevatten.', confirmRequired: 'Bevestiging is verplicht.', mismatch: 'Wachtwoorden komen niet overeen.',
    submit: 'Wachtwoord wijzigen', forceMessage: 'U moet eerst uw wachtwoord wijzigen.', success: 'Uw wachtwoord is gewijzigd.',
    error: 'Er is een fout opgetreden bij het wijzigen van het wachtwoord.',
  },
  resetPassword: {
    title: 'Wachtwoord opnieuw instellen',
    loading: 'Laden…',
    emailLabel: 'E-mail',
    emailPlaceholder: 'uw e-mailadres',
    emailRequired: 'E-mail is verplicht.',
    emailInvalid: 'Het e-mailadres is niet geldig.',
    emailHint: 'Er wordt een resetlink verzonden als het e-mailadres bestaat.',
    successMessage: 'Als er een account bestaat voor dit adres, is er een reset-e-mail verzonden.',
    errorGeneric: 'Er is een fout opgetreden. Probeer het later opnieuw.',
    formInvalid: 'Corrigeer de fouten in het formulier.',
    confirm: {
      title: 'Nieuw wachtwoord',
      subtitle: 'Kies een nieuw wachtwoord voor uw account.',
      confirmPassword: 'Bevestig wachtwoord',
      backToLogin: 'Terug naar aanmelden',
      linkInvalidOrIncomplete: 'De resetlink is ongeldig of onvolledig.',
      linkInvalidOrExpired: 'De resetlink is ongeldig of verlopen.',
      successReset: 'Uw wachtwoord is opnieuw ingesteld. U kunt zich nu aanmelden.',
      errorGeneric: 'Kan het wachtwoord niet opnieuw instellen.',
    },
  },
  confirmEmail: {
    title: 'E-mailbevestiging',
    subtitle: 'Bevestiging van uw registratie',
    inProgress: 'Bevestiging bezig…',
    successFallback: 'E-mailadres met succes bevestigd.',
    errorFallback: 'Kan dit e-mailadres niet bevestigen.',
    invalidLink: 'De bevestigingslink is ongeldig of onvolledig.',
  },
  preferences: {
    eyebrow: 'Mijn account', title: 'Voorkeuren', subtitle: 'Beheer uw profiel, interfacetaal en huidig domein.', profileTitle: 'Profiel',
    profileSubtitle: 'Persoonlijke gegevens en weergavevoorkeuren.', summaryTitle: 'Overzicht', summarySubtitle: 'Snelle weergave van uw huidige account.',
    loading: 'Laden...', username: 'Gebruikersnaam', email: 'E-mail', firstName: 'Voornaam', lastName: 'Achternaam', language: 'Taal',
    domains: 'Gekoppelde domeinen', chooseDomains: 'Kies gekoppelde domeinen', currentDomain: 'Huidig domein', chooseLanguage: 'Kies een taal', noDomain: 'Geen domein', save: 'Opslaan', changePassword: 'Wachtwoord wijzigen',
    role: 'Rol', user: 'Gebruiker', currentDomainLabel: 'Huidig domein', managedDomains: 'Beheerde domeinen', ownedDomains: 'Eigen domeinen',
    activeAccount: 'Actief account', yes: 'Ja', no: 'Nee', roleSuperuser: 'Superuser', roleManager: 'Beheerder', roleUser: 'Gebruiker', roleOwner: 'Eigenaar', roleMember: 'Gekoppeld lid', domainsTitle: 'Domeinen', domainsSubtitle: 'Beheer uw gekoppelde domeinen en kies het huidige domein.', linkedDomainsList: 'Zichtbare domeinen', currentBadge: 'Huidig', setCurrent: 'Instellen als huidig', unlinkDomain: 'Verlaten', addDomain: 'Domein koppelen', noMoreDomains: 'Geen extra domein beschikbaar.', linkSelectedDomains: 'Selectie koppelen', cancel: 'Annuleren', ownerLabel: 'Eigenaar:', deleteDomain: 'Verwijderen', deleteDomainSuccess: 'Domein verwijderd.', deleteDomainError: 'Kan dit domein niet verwijderen.',
    loadError: 'Kan uw voorkeuren niet laden.', saveError: 'Kan voorkeuren niet opslaan.', saveSuccess: 'Voorkeuren opgeslagen.', userMissing: 'Gebruiker niet gevonden.',
    pendingRequestsTitle: 'Mijn openstaande aanvragen',
    pendingRequestsEmpty: 'Geen openstaande aanvraag.',
    pendingRequestsRequestedAt: 'Aangevraagd op',
    pendingRequestsCancel: 'Aanvraag annuleren',
    notificationsTitle: 'E-mailmeldingen',
    notificationsSubtitle: 'Kies welke e-mails u wilt ontvangen. Kritieke e-mails (registratiebevestiging, wachtwoordherstel, aanmeldlink) worden altijd verzonden.',
    notificationKindJoinRequestCreated: 'Nieuwe toegangsaanvraag op een domein dat ik beheer',
    notificationKindJoinRequestDecided: 'Beslissing (goedgekeurd / afgewezen) op een van mijn aanvragen',
    notificationKindJoinRequestExpiry: 'Waarschuwing voor de automatische annulering van een openstaande aanvraag',
    notificationKindInviteReceived: 'Uitnodiging om een domein te vervoegen',
    notificationKindTransferReceived: 'Voorstel voor eigendomsoverdracht',
    notificationKindQuizAssignment: 'Een quiz is mij toegewezen',
    notificationKindQuizCompleted: 'Een gebruiker heeft een van mijn quizzen voltooid',
    notificationKindQuizResultAvailable: 'Mijn score op een quiz is beschikbaar',
    notificationKindQuizDetailAvailable: 'De gedetailleerde correctie van een quiz is beschikbaar',
    notificationChannelEmail: 'E-mail',
    notificationChannelWeb: 'Bel',
    notificationGroupUser: 'Mijn meldingen',
    notificationGroupManager: 'Als beheerder',
    notificationGroupOwner: 'Als eigenaar',
    notificationsSaved: 'Meldingsvoorkeuren opgeslagen.',
  },
  notifications: {
    bellTitle: 'Meldingen',
    bellEmpty: 'Geen meldingen.',
    bellMarkAllRead: 'Alles als gelezen markeren',
    bellSeeAll: 'Alle meldingen bekijken',
    pageTitle: 'Meldingen',
    pageSubtitle: 'Alles wat er op uw domeinen en uitnodigingen gebeurt.',
    filterUnread: 'Ongelezen',
    filterAll: 'Alle',
    filterDeleted: 'Prullenbak',
    empty: 'Niets om weer te geven.',
    actionMarkRead: 'Markeer als gelezen',
    actionDelete: 'Verwijderen',
    relative: (s) => {
      const sec = Math.max(0, Math.round(s));
      if (sec < 60) return 'zojuist';
      const m = Math.floor(sec / 60);
      if (m < 60) return `${m} min geleden`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h} u geleden`;
      const d = Math.floor(h / 24);
      return `${d} d geleden`;
    },
    kindLine: (kind, payload) => {
      const dn = String((payload as {domain_name?: string})?.domain_name ?? '');
      const ru = String((payload as {requester_username?: string})?.requester_username ?? '');
      const iu = String((payload as {inviter_username?: string})?.inviter_username ?? '');
      const ii = String((payload as {initiator_username?: string})?.initiator_username ?? '');
      const oc = String((payload as {outcome?: string})?.outcome ?? '');
      switch (kind) {
        case 'domain.join_request.created':
          return `${ru || 'Een gebruiker'} wil graag deelnemen aan "${dn}".`;
        case 'domain.join_request.decided':
          return oc === 'approved'
            ? `Uw aanvraag voor "${dn}" is goedgekeurd.`
            : `Uw aanvraag voor "${dn}" is afgewezen.`;
        case 'domain.join_request.expiry_warning':
          return `Uw aanvraag voor "${dn}" verloopt binnenkort.`;
        case 'domain.invite.received':
          return `${iu || 'Iemand'} heeft u uitgenodigd voor "${dn}".`;
        case 'domain.transfer.received':
          return `${ii || 'De eigenaar'} stelt u het eigendom van "${dn}" voor.`;
        case 'quiz.assignment':
          return `Een nieuwe quiz "${String((payload as {template_title?: string})?.template_title ?? '')}" is aan u toegewezen.`;
        case 'quiz.completed':
          return `${String((payload as {user_username?: string})?.user_username ?? 'Een gebruiker')} heeft zojuist "${String((payload as {template_title?: string})?.template_title ?? '')}" voltooid.`;
        case 'quiz.result_available':
          return `Uw score op "${String((payload as {template_title?: string})?.template_title ?? '')}" is beschikbaar.`;
        case 'quiz.detail_available':
          return `De gedetailleerde correctie van "${String((payload as {template_title?: string})?.template_title ?? '')}" is beschikbaar.`;
        default:
          return kind;
      }
    },
  },
  admin: {
    menuLabel: 'Administratie',
    stats: {
      title: 'Statistieken',
      activeUsers: 'Actieve gebruikers',
      activeDomains: 'Actieve domeinen',
      activeQuestions: 'Actieve vragen',
      completedSessions: 'Voltooide sessies',
      domain: 'Domein',
      members: 'Leden',
      managers: 'Beheerders',
      questions: 'Vragen',
      templates: 'Sjablonen',
      sessions: 'Sessies',
      completion: 'Voltooiing',
    },
    languages: {
      title: 'Taalbeheer',
      addLanguage: 'Taal toevoegen',
      code: 'Code',
      name: 'Naam',
      active: 'Actief',
      editLanguage: 'Taal bewerken',
      deleteConfirm: 'Weet u zeker dat u deze taal wilt verwijderen?',
      actions: 'Acties',
    },
    mailTest: {
      title: 'E-mailtest',
      eyebrow: 'SMTP / Outbox',
      subtitle: 'Start een testmail via de echte backend-mailstroom.',
      formTitle: 'Een testmail verzenden',
      formSubtitle: 'De backend plaatst het bericht eerst in de outbox en start daarna de standaardlevering.',
      to: 'Ontvanger',
      toPlaceholder: 'ontvanger@example.com',
      toRequired: 'E-mailadres is verplicht.',
      toInvalid: 'E-mailadres is ongeldig.',
      subject: 'Onderwerp',
      subjectPlaceholder: 'Leeg laten om het standaardonderwerp te gebruiken',
      subjectHint: 'Optioneel. Indien leeg maakt de backend zelf een testonderwerp.',
      body: 'Bericht',
      bodyPlaceholder: 'Leeg laten om de standaardtekst te gebruiken',
      bodyHint: 'Optioneel. Indien leeg maakt de backend zelf een bericht met tijdstempel.',
      send: 'Testmail verzenden',
      sending: 'Verzenden...',
      successTitle: 'E-mail in wachtrij',
      errorTitle: 'Verzenden mislukt',
      errorFallback: 'Kan de testmail niet verzenden.',
      resultTitle: 'Laatste verzending',
      resultSubtitle: 'Onmiddellijke API-respons na het in de wachtrij plaatsen.',
      resultEmpty: 'In deze sessie is nog geen testmail verzonden.',
      emailId: 'Outbox-ID',
      recipients: 'Ontvangers',
      deliveryNote: 'Als broker of SMTP niet beschikbaar is, kan het bericht in de wachtrij blijven of in gedegradeerde modus worden geleverd, afhankelijk van de backendconfiguratie.',
    },
    systemConfig: {
      title: 'Systeemconfiguratie',
      eyebrow: 'Diagnostiek',
      subtitle: 'Alleen-lezen overzicht van de effectieve runtimeconfiguratie met controles op aanvraag.',
      loading: 'Configuratie laden...',
      checking: 'Controleren...',
      checkedAt: 'Gecontroleerd op',
      checkResultTitle: 'Resultaat van de controle',
      errorTitle: 'Systeemfout',
      loadError: 'Kan de systeemconfiguratie niet laden.',
      checkError: 'Kan deze controle niet uitvoeren.',
      sections: {
        db: {
          title: 'Database',
          description: 'Engine, doel en verbindingsinstellingen met maskering.',
          check: 'DB testen',
          fields: {engine: 'Engine', name: 'Naam', host: 'Host', port: 'Poort', conn_max_age: 'Conn max age'},
        },
        email: {
          title: 'E-mail',
          description: 'E-mailbackend, afzender en leveringsafhankelijkheden.',
          check: 'E-mail testen',
          fields: {
            backend: 'Backend',
            host: 'Host',
            port: 'Poort',
            use_tls: 'TLS',
            host_user: 'Gebruiker',
            host_password_configured: 'Wachtwoord geconfigureerd',
            default_from_email: 'From',
            celery_broker_url: 'Celery broker',
            celery_result_backend: 'Result backend',
          },
        },
        upload: {
          title: 'Upload',
          description: 'Mediadirectory en actieve uploadlimieten.',
          check: 'Schrijven testen',
          fields: {
            media_root: 'Media root',
            media_root_exists: 'Map bestaat',
            data_upload_max_memory_size: 'Data upload max',
            file_upload_max_memory_size: 'File upload max',
            max_upload_file_size: 'Max bestandsgrootte',
          },
        },
        deepl: {
          title: 'DeepL',
          description: 'Activeringsstatus en aanwezigheid van de sleutel zonder het geheim te tonen.',
          check: 'DeepL testen',
          fields: {enabled: 'Actief', auth_key_configured: 'Sleutel geconfigureerd', is_free: 'Free-plan'},
        },
      },
    },
    joinRequests: {
      title: 'Toegangsaanvragen',
      user: 'Gebruiker',
      email: 'E-mail',
      requestedAt: 'Aangevraagd op',
      status: 'Status',
      actions: 'Acties',
      approve: 'Goedkeuren',
      reject: 'Afwijzen',
      rejectReason: 'Reden van afwijzing',
      rejectReasonPlaceholder: 'Geef de reden van afwijzing op…',
      pending: 'In afwachting',
      approved: 'Goedgekeurd',
      rejected: 'Afgewezen',
      cancelled: 'Geannuleerd',
      all: 'Alle',
      noRequests: 'Geen aanvragen.',
      moderate: 'Toegangsaanvragen modereren',
      decidedBy: 'Beslist door',
      decidedAt: 'Beslist op',
      reason: 'Reden',
      noReason: '—',
      bulkPlaceholder: 'Bulkacties…',
      bulkApply: 'Toepassen',
      bulkApprove: 'Selectie goedkeuren',
      bulkReject: 'Selectie afwijzen',
      bulkCancel: 'Annuleren',
      bulkSelectedCount: (n) => `${n} geselecteerd`,
      bulkRejectHeader: 'Meerdere aanvragen afwijzen',
      bulkRejectMessage: (n) => `De onderstaande reden wordt voor de ${n} afgewezen aanvragen opgeslagen.`,
      bulkActionFailed: 'Een of meer acties zijn mislukt.',
      bulkResultTitle: 'Bulkactie voltooid',
      bulkResultDetail: (processed, skipped) => skipped > 0
        ? `${processed} aanvra(a)g(en) verwerkt, ${skipped} overgeslagen (al beslist of buiten bereik).`
        : `${processed} aanvra(a)g(en) verwerkt.`,
    },
  },
};

