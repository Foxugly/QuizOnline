import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export type DomainEditUiText = {
  tabs: {
    config: string;
    members: string;
    audit: string;
  };
  audit: {
    title: string;
    empty: string;
    colWhen: string;
    colActor: string;
    colAction: string;
    colTarget: string;
    actionLabel: (action: string) => string;
    systemActor: string;
  };
  errors: {
    invalidId: string;
    loadDomainFailed: string;
    formInvalid: string;
    needOneLanguage: string;
    saveFailed: string;
    translationFailed: string;
  };
  members: {
    pendingTitle: string;
    pendingNone: string;
    pendingOpenModeration: string;
    colUser: string;
    colEmail: string;
    colRequestedAt: string;
    colRole: string;
    colActions: string;
    membersTitle: string;
    membersNone: string;
    roleOwner: string;
    roleManager: string;
    roleMember: string;
    promote: string;
    demote: string;
    remove: string;
    confirmRemoveHeader: string;
    confirmRemoveMessage: (username: string) => string;
    confirmRemoveAccept: string;
    confirmRemoveCancel: string;
    actionFailed: string;
    inviteButton: string;
    inviteDialogTitle: string;
    inviteDialogHint: string;
    inviteEmailsLabel: string;
    inviteEmailsPlaceholder: string;
    inviteSubmit: string;
    inviteCancel: string;
    inviteResultSent: (email: string) => string;
    inviteResultAlreadyMember: (email: string) => string;
    inviteResultInvalid: (email: string) => string;
    inviteResultForbidden: (email: string) => string;
    inviteResultSummary: (sent: number, total: number) => string;
    inviteAdditionalDomainsLabel: string;
    inviteAdditionalDomainsHint: string;
    inviteAdditionalDomainsPlaceholder: string;
    inviteResultDomainPrefix: (domainName: string) => string;
    invitationsTitle: string;
    invitationsEmpty: string;
    invitationsColEmail: string;
    invitationsColSentAt: string;
    invitationsColExpiresAt: string;
    invitationResend: string;
    invitationRevoke: string;
    invitationConfirmRevokeHeader: string;
    invitationConfirmRevokeMessage: (email: string) => string;
    invitationConfirmRevokeAccept: string;
    invitationConfirmRevokeCancel: string;
  };
  transfer: {
    button: string;
    dialogTitle: string;
    dialogHint: string;
    pickPlaceholder: string;
    submit: string;
    sending: string;
    cancel: string;
    successMessage: string;
    errorAlreadyOwner: string;
    errorTargetUnreachable: string;
    errorGeneric: string;
  };
};

const FR_ACTION_LABELS: Record<string, string> = {
  'member.promote': 'Promu gestionnaire',
  'member.demote': 'Rétrogradé en membre',
  'member.remove': 'Retiré du domaine',
  'member.self_leave': 'A quitté le domaine',
  'join_request.approve': 'Demande approuvée',
  'join_request.reject': 'Demande refusée',
  'join_request.approve_via_email': 'Demande approuvée (mail)',
  'join_request.reject_via_email': 'Demande refusée (mail)',
  'invite.bulk_send': 'Invitations envoyées',
  'invite.resend': 'Invitation renvoyée',
  'invite.revoke': 'Invitation révoquée',
  'invite.accept_via_link': 'Invitation acceptée',
  'invite.auto_accept_on_signup': 'Invitation acceptée à l\'inscription',
  'transfer.initiate': 'Transfert de propriété initié',
  'transfer.accept': 'Transfert de propriété accepté',
};

const EN_ACTION_LABELS: Record<string, string> = {
  'member.promote': 'Promoted to manager',
  'member.demote': 'Demoted to member',
  'member.remove': 'Removed from domain',
  'member.self_leave': 'Left the domain',
  'join_request.approve': 'Request approved',
  'join_request.reject': 'Request rejected',
  'join_request.approve_via_email': 'Request approved (email)',
  'join_request.reject_via_email': 'Request rejected (email)',
  'invite.bulk_send': 'Invitations sent',
  'invite.resend': 'Invitation resent',
  'invite.revoke': 'Invitation revoked',
  'invite.accept_via_link': 'Invitation accepted',
  'invite.auto_accept_on_signup': 'Invitation accepted on signup',
  'transfer.initiate': 'Ownership transfer initiated',
  'transfer.accept': 'Ownership transfer accepted',
};

const NL_ACTION_LABELS: Record<string, string> = {
  'member.promote': 'Bevorderd tot beheerder',
  'member.demote': 'Gedegradeerd tot lid',
  'member.remove': 'Verwijderd uit domein',
  'member.self_leave': 'Heeft het domein verlaten',
  'join_request.approve': 'Aanvraag goedgekeurd',
  'join_request.reject': 'Aanvraag afgewezen',
  'join_request.approve_via_email': 'Aanvraag goedgekeurd (e-mail)',
  'join_request.reject_via_email': 'Aanvraag afgewezen (e-mail)',
  'invite.bulk_send': 'Uitnodigingen verzonden',
  'invite.resend': 'Uitnodiging opnieuw verzonden',
  'invite.revoke': 'Uitnodiging ingetrokken',
  'invite.accept_via_link': 'Uitnodiging aanvaard',
  'invite.auto_accept_on_signup': 'Uitnodiging aanvaard bij aanmelding',
  'transfer.initiate': 'Eigendomsoverdracht gestart',
  'transfer.accept': 'Eigendomsoverdracht aanvaard',
};

const IT_ACTION_LABELS: Record<string, string> = {
  'member.promote': 'Promosso a gestore',
  'member.demote': 'Retrocesso a membro',
  'member.remove': 'Rimosso dal dominio',
  'member.self_leave': 'Ha lasciato il dominio',
  'join_request.approve': 'Richiesta approvata',
  'join_request.reject': 'Richiesta rifiutata',
  'join_request.approve_via_email': 'Richiesta approvata (e-mail)',
  'join_request.reject_via_email': 'Richiesta rifiutata (e-mail)',
  'invite.bulk_send': 'Inviti inviati',
  'invite.resend': 'Invito reinviato',
  'invite.revoke': 'Invito revocato',
  'invite.accept_via_link': 'Invito accettato',
  'invite.auto_accept_on_signup': 'Invito accettato all\'iscrizione',
  'transfer.initiate': 'Trasferimento di proprietà avviato',
  'transfer.accept': 'Trasferimento di proprietà accettato',
};

const ES_ACTION_LABELS: Record<string, string> = {
  'member.promote': 'Promovido a gestor',
  'member.demote': 'Degradado a miembro',
  'member.remove': 'Eliminado del dominio',
  'member.self_leave': 'Abandonó el dominio',
  'join_request.approve': 'Solicitud aprobada',
  'join_request.reject': 'Solicitud rechazada',
  'join_request.approve_via_email': 'Solicitud aprobada (correo)',
  'join_request.reject_via_email': 'Solicitud rechazada (correo)',
  'invite.bulk_send': 'Invitaciones enviadas',
  'invite.resend': 'Invitación reenviada',
  'invite.revoke': 'Invitación revocada',
  'invite.accept_via_link': 'Invitación aceptada',
  'invite.auto_accept_on_signup': 'Invitación aceptada al registrarse',
  'transfer.initiate': 'Transferencia de propiedad iniciada',
  'transfer.accept': 'Transferencia de propiedad aceptada',
};

const FR: DomainEditUiText = {
  tabs: {config: 'Configuration', members: 'Membres', audit: 'Journal'},
  audit: {
    title: 'Journal des actions',
    empty: 'Aucune action enregistrée.',
    colWhen: 'Date',
    colActor: 'Acteur',
    colAction: 'Action',
    colTarget: 'Cible',
    actionLabel: (action) => FR_ACTION_LABELS[action] ?? action,
    systemActor: 'système',
  },
  errors: {
    invalidId: 'Identifiant invalide.',
    loadDomainFailed: 'Impossible de charger le domaine.',
    formInvalid: 'Le formulaire contient des erreurs.',
    needOneLanguage: 'Sélectionne au moins une langue valide.',
    saveFailed: 'Erreur lors de l\'enregistrement.',
    translationFailed: 'Erreur lors de la traduction.',
  },
  members: {
    pendingTitle: 'Demandes en attente',
    pendingNone: 'Aucune demande en attente.',
    pendingOpenModeration: 'Modérer les demandes',
    colUser: 'Utilisateur',
    colEmail: 'E-mail',
    colRequestedAt: 'Demandé le',
    colRole: 'Rôle',
    colActions: 'Actions',
    membersTitle: 'Membres',
    membersNone: 'Aucun membre.',
    roleOwner: 'Propriétaire',
    roleManager: 'Gestionnaire',
    roleMember: 'Membre',
    promote: 'Promouvoir gestionnaire',
    demote: 'Rétrograder en membre',
    remove: 'Retirer du domaine',
    confirmRemoveHeader: 'Retirer ce membre ?',
    confirmRemoveMessage: (username) => `Retirer ${username} du domaine ? Cette action est immédiate.`,
    confirmRemoveAccept: 'Retirer',
    confirmRemoveCancel: 'Annuler',
    actionFailed: 'L\'action a échoué.',
    inviteButton: 'Inviter par e-mail',
    inviteDialogTitle: 'Inviter de nouveaux membres',
    inviteDialogHint: 'Saisis une ou plusieurs adresses e-mail (séparées par des virgules ou des sauts de ligne).',
    inviteEmailsLabel: 'Adresses e-mail',
    inviteEmailsPlaceholder: 'alice@example.com, bob@example.com',
    inviteSubmit: 'Envoyer les invitations',
    inviteCancel: 'Annuler',
    inviteResultSent: (email) => `${email} : invitation envoyée.`,
    inviteResultAlreadyMember: (email) => `${email} : déjà membre.`,
    inviteResultInvalid: (email) => `${email} : adresse invalide.`,
    inviteResultForbidden: (email) => `${email} : vous n'avez pas le droit d'inviter sur ce domaine.`,
    inviteResultSummary: (sent, total) => `${sent} invitation${sent > 1 ? 's' : ''} envoyée${sent > 1 ? 's' : ''} sur ${total}.`,
    inviteAdditionalDomainsLabel: 'Inviter aussi sur d\'autres domaines',
    inviteAdditionalDomainsHint: 'Optionnel. Les mêmes adresses recevront une invitation pour chacun des domaines choisis.',
    inviteAdditionalDomainsPlaceholder: 'Choisir un ou plusieurs domaines…',
    inviteResultDomainPrefix: (domainName) => `[${domainName}]`,
    invitationsTitle: 'Invitations en attente',
    invitationsEmpty: 'Aucune invitation en attente.',
    invitationsColEmail: 'E-mail',
    invitationsColSentAt: 'Envoyée le',
    invitationsColExpiresAt: 'Expire le',
    invitationResend: 'Renvoyer',
    invitationRevoke: 'Révoquer',
    invitationConfirmRevokeHeader: 'Révoquer cette invitation ?',
    invitationConfirmRevokeMessage: (email) => `Révoquer l'invitation pour ${email} ? Le lien envoyé deviendra invalide.`,
    invitationConfirmRevokeAccept: 'Révoquer',
    invitationConfirmRevokeCancel: 'Annuler',
  },
  transfer: {
    button: 'Transférer la propriété',
    dialogTitle: 'Transférer la propriété du domaine',
    dialogHint: 'Choisis le nouveau propriétaire. Un e-mail lui sera envoyé : la propriété ne change pas tant qu\'il n\'a pas confirmé.',
    pickPlaceholder: 'Sélectionner un utilisateur',
    submit: 'Envoyer la proposition',
    sending: 'Envoi…',
    cancel: 'Annuler',
    successMessage: 'Proposition envoyée. Le futur propriétaire recevra un e-mail.',
    errorAlreadyOwner: 'Cet utilisateur est déjà le propriétaire.',
    errorTargetUnreachable: 'L\'utilisateur n\'a pas d\'adresse e-mail valide.',
    errorGeneric: 'Impossible d\'envoyer la proposition.',
  },
};

const EN: DomainEditUiText = {
  tabs: {config: 'Configuration', members: 'Members', audit: 'Activity'},
  audit: {
    title: 'Activity log',
    empty: 'No action recorded yet.',
    colWhen: 'When',
    colActor: 'Actor',
    colAction: 'Action',
    colTarget: 'Target',
    actionLabel: (action) => EN_ACTION_LABELS[action] ?? action,
    systemActor: 'system',
  },
  errors: {
    invalidId: 'Invalid identifier.',
    loadDomainFailed: 'Failed to load the domain.',
    formInvalid: 'The form contains errors.',
    needOneLanguage: 'Select at least one valid language.',
    saveFailed: 'Error while saving.',
    translationFailed: 'Error while translating.',
  },
  members: {
    pendingTitle: 'Pending requests',
    pendingNone: 'No pending request.',
    pendingOpenModeration: 'Moderate requests',
    colUser: 'User',
    colEmail: 'Email',
    colRequestedAt: 'Requested at',
    colRole: 'Role',
    colActions: 'Actions',
    membersTitle: 'Members',
    membersNone: 'No member.',
    roleOwner: 'Owner',
    roleManager: 'Manager',
    roleMember: 'Member',
    promote: 'Promote to manager',
    demote: 'Demote to member',
    remove: 'Remove from domain',
    confirmRemoveHeader: 'Remove this member?',
    confirmRemoveMessage: (username) => `Remove ${username} from the domain? This is immediate.`,
    confirmRemoveAccept: 'Remove',
    confirmRemoveCancel: 'Cancel',
    actionFailed: 'The action failed.',
    inviteButton: 'Invite by email',
    inviteDialogTitle: 'Invite new members',
    inviteDialogHint: 'Enter one or more email addresses (comma- or newline-separated).',
    inviteEmailsLabel: 'Email addresses',
    inviteEmailsPlaceholder: 'alice@example.com, bob@example.com',
    inviteSubmit: 'Send invitations',
    inviteCancel: 'Cancel',
    inviteResultSent: (email) => `${email}: invitation sent.`,
    inviteResultAlreadyMember: (email) => `${email}: already a member.`,
    inviteResultInvalid: (email) => `${email}: invalid address.`,
    inviteResultForbidden: (email) => `${email}: you cannot invite to this domain.`,
    inviteResultSummary: (sent, total) => `${sent} invitation${sent > 1 ? 's' : ''} sent out of ${total}.`,
    inviteAdditionalDomainsLabel: 'Also invite to other domains',
    inviteAdditionalDomainsHint: 'Optional. The same addresses will receive an invitation for every domain you pick.',
    inviteAdditionalDomainsPlaceholder: 'Pick one or more domains…',
    inviteResultDomainPrefix: (domainName) => `[${domainName}]`,
    invitationsTitle: 'Pending invitations',
    invitationsEmpty: 'No pending invitation.',
    invitationsColEmail: 'Email',
    invitationsColSentAt: 'Sent at',
    invitationsColExpiresAt: 'Expires at',
    invitationResend: 'Resend',
    invitationRevoke: 'Revoke',
    invitationConfirmRevokeHeader: 'Revoke this invitation?',
    invitationConfirmRevokeMessage: (email) => `Revoke the invitation for ${email}? The link already sent will stop working.`,
    invitationConfirmRevokeAccept: 'Revoke',
    invitationConfirmRevokeCancel: 'Cancel',
  },
  transfer: {
    button: 'Transfer ownership',
    dialogTitle: 'Transfer domain ownership',
    dialogHint: 'Pick the new owner. An email will be sent — ownership does not change until they confirm.',
    pickPlaceholder: 'Select a user',
    submit: 'Send proposal',
    sending: 'Sending…',
    cancel: 'Cancel',
    successMessage: 'Proposal sent. The future owner will receive an email.',
    errorAlreadyOwner: 'This user is already the owner.',
    errorTargetUnreachable: 'This user has no valid email address.',
    errorGeneric: 'Unable to send the proposal.',
  },
};

const NL: DomainEditUiText = {
  tabs: {config: 'Configuratie', members: 'Leden', audit: 'Activiteit'},
  audit: {
    title: 'Activiteitenlogboek',
    empty: 'Nog geen actie geregistreerd.',
    colWhen: 'Wanneer',
    colActor: 'Actor',
    colAction: 'Actie',
    colTarget: 'Doel',
    actionLabel: (action) => NL_ACTION_LABELS[action] ?? action,
    systemActor: 'systeem',
  },
  errors: {
    invalidId: 'Ongeldige identificatie.',
    loadDomainFailed: 'Kan het domein niet laden.',
    formInvalid: 'Het formulier bevat fouten.',
    needOneLanguage: 'Selecteer minstens één geldige taal.',
    saveFailed: 'Fout bij het opslaan.',
    translationFailed: 'Fout bij het vertalen.',
  },
  members: {
    pendingTitle: 'Openstaande aanvragen',
    pendingNone: 'Geen openstaande aanvraag.',
    pendingOpenModeration: 'Aanvragen modereren',
    colUser: 'Gebruiker',
    colEmail: 'E-mail',
    colRequestedAt: 'Aangevraagd op',
    colRole: 'Rol',
    colActions: 'Acties',
    membersTitle: 'Leden',
    membersNone: 'Geen lid.',
    roleOwner: 'Eigenaar',
    roleManager: 'Beheerder',
    roleMember: 'Lid',
    promote: 'Promoveren tot beheerder',
    demote: 'Degraderen tot lid',
    remove: 'Verwijderen uit domein',
    confirmRemoveHeader: 'Dit lid verwijderen?',
    confirmRemoveMessage: (username) => `${username} uit het domein verwijderen? Dit gebeurt direct.`,
    confirmRemoveAccept: 'Verwijderen',
    confirmRemoveCancel: 'Annuleren',
    actionFailed: 'De actie is mislukt.',
    inviteButton: 'Per e-mail uitnodigen',
    inviteDialogTitle: 'Nieuwe leden uitnodigen',
    inviteDialogHint: 'Voer een of meer e-mailadressen in (gescheiden door komma\'s of regeleinden).',
    inviteEmailsLabel: 'E-mailadressen',
    inviteEmailsPlaceholder: 'alice@example.com, bob@example.com',
    inviteSubmit: 'Uitnodigingen versturen',
    inviteCancel: 'Annuleren',
    inviteResultSent: (email) => `${email}: uitnodiging verzonden.`,
    inviteResultAlreadyMember: (email) => `${email}: is al lid.`,
    inviteResultInvalid: (email) => `${email}: ongeldig adres.`,
    inviteResultForbidden: (email) => `${email}: u mag niet uitnodigen voor dit domein.`,
    inviteResultSummary: (sent, total) => `${sent} van ${total} uitnodigingen verzonden.`,
    inviteAdditionalDomainsLabel: 'Ook uitnodigen voor andere domeinen',
    inviteAdditionalDomainsHint: 'Optioneel. Dezelfde adressen ontvangen een uitnodiging voor elk gekozen domein.',
    inviteAdditionalDomainsPlaceholder: 'Kies een of meer domeinen…',
    inviteResultDomainPrefix: (domainName) => `[${domainName}]`,
    invitationsTitle: 'Openstaande uitnodigingen',
    invitationsEmpty: 'Geen openstaande uitnodiging.',
    invitationsColEmail: 'E-mail',
    invitationsColSentAt: 'Verzonden op',
    invitationsColExpiresAt: 'Verloopt op',
    invitationResend: 'Opnieuw verzenden',
    invitationRevoke: 'Intrekken',
    invitationConfirmRevokeHeader: 'Deze uitnodiging intrekken?',
    invitationConfirmRevokeMessage: (email) => `De uitnodiging voor ${email} intrekken? De reeds verzonden link werkt niet meer.`,
    invitationConfirmRevokeAccept: 'Intrekken',
    invitationConfirmRevokeCancel: 'Annuleren',
  },
  transfer: {
    button: 'Eigenaarschap overdragen',
    dialogTitle: 'Domeineigenaarschap overdragen',
    dialogHint: 'Kies de nieuwe eigenaar. Er wordt een e-mail verzonden — het eigenaarschap verandert pas na bevestiging.',
    pickPlaceholder: 'Een gebruiker selecteren',
    submit: 'Voorstel verzenden',
    sending: 'Versturen…',
    cancel: 'Annuleren',
    successMessage: 'Voorstel verzonden. De toekomstige eigenaar ontvangt een e-mail.',
    errorAlreadyOwner: 'Deze gebruiker is al eigenaar.',
    errorTargetUnreachable: 'Deze gebruiker heeft geen geldig e-mailadres.',
    errorGeneric: 'Kan het voorstel niet verzenden.',
  },
};

const IT: DomainEditUiText = {
  tabs: {config: 'Configurazione', members: 'Membri', audit: 'Attività'},
  audit: {
    title: 'Registro attività',
    empty: 'Nessuna azione registrata.',
    colWhen: 'Quando',
    colActor: 'Attore',
    colAction: 'Azione',
    colTarget: 'Bersaglio',
    actionLabel: (action) => IT_ACTION_LABELS[action] ?? action,
    systemActor: 'sistema',
  },
  errors: {
    invalidId: 'Identificatore non valido.',
    loadDomainFailed: 'Impossibile caricare il dominio.',
    formInvalid: 'Il modulo contiene errori.',
    needOneLanguage: 'Seleziona almeno una lingua valida.',
    saveFailed: 'Errore durante il salvataggio.',
    translationFailed: 'Errore durante la traduzione.',
  },
  members: {
    pendingTitle: 'Richieste in attesa',
    pendingNone: 'Nessuna richiesta in attesa.',
    pendingOpenModeration: 'Modera le richieste',
    colUser: 'Utente',
    colEmail: 'E-mail',
    colRequestedAt: 'Richiesto il',
    colRole: 'Ruolo',
    colActions: 'Azioni',
    membersTitle: 'Membri',
    membersNone: 'Nessun membro.',
    roleOwner: 'Proprietario',
    roleManager: 'Gestore',
    roleMember: 'Membro',
    promote: 'Promuovi a gestore',
    demote: 'Retrocedi a membro',
    remove: 'Rimuovi dal dominio',
    confirmRemoveHeader: 'Rimuovere questo membro?',
    confirmRemoveMessage: (username) => `Rimuovere ${username} dal dominio? L'operazione è immediata.`,
    confirmRemoveAccept: 'Rimuovi',
    confirmRemoveCancel: 'Annulla',
    actionFailed: 'L\'azione non è riuscita.',
    inviteButton: 'Invita per e-mail',
    inviteDialogTitle: 'Invita nuovi membri',
    inviteDialogHint: 'Inserisci uno o più indirizzi e-mail (separati da virgole o a capo).',
    inviteEmailsLabel: 'Indirizzi e-mail',
    inviteEmailsPlaceholder: 'alice@example.com, bob@example.com',
    inviteSubmit: 'Invia gli inviti',
    inviteCancel: 'Annulla',
    inviteResultSent: (email) => `${email}: invito inviato.`,
    inviteResultAlreadyMember: (email) => `${email}: già membro.`,
    inviteResultInvalid: (email) => `${email}: indirizzo non valido.`,
    inviteResultForbidden: (email) => `${email}: non puoi invitare su questo dominio.`,
    inviteResultSummary: (sent, total) => `${sent} invit${sent > 1 ? 'i inviati' : 'o inviato'} su ${total}.`,
    inviteAdditionalDomainsLabel: 'Invita anche su altri domini',
    inviteAdditionalDomainsHint: 'Facoltativo. Gli stessi indirizzi riceveranno un invito per ciascun dominio scelto.',
    inviteAdditionalDomainsPlaceholder: 'Scegli uno o più domini…',
    inviteResultDomainPrefix: (domainName) => `[${domainName}]`,
    invitationsTitle: 'Inviti in attesa',
    invitationsEmpty: 'Nessun invito in attesa.',
    invitationsColEmail: 'E-mail',
    invitationsColSentAt: 'Inviato il',
    invitationsColExpiresAt: 'Scade il',
    invitationResend: 'Reinvia',
    invitationRevoke: 'Revoca',
    invitationConfirmRevokeHeader: 'Revocare questo invito?',
    invitationConfirmRevokeMessage: (email) => `Revocare l'invito per ${email}? Il link già inviato smetterà di funzionare.`,
    invitationConfirmRevokeAccept: 'Revoca',
    invitationConfirmRevokeCancel: 'Annulla',
  },
  transfer: {
    button: 'Trasferisci la proprietà',
    dialogTitle: 'Trasferisci la proprietà del dominio',
    dialogHint: 'Scegli il nuovo proprietario. Verrà inviata un\'e-mail: la proprietà non cambia finché non conferma.',
    pickPlaceholder: 'Seleziona un utente',
    submit: 'Invia la proposta',
    sending: 'Invio in corso…',
    cancel: 'Annulla',
    successMessage: 'Proposta inviata. Il futuro proprietario riceverà un\'e-mail.',
    errorAlreadyOwner: 'Questo utente è già il proprietario.',
    errorTargetUnreachable: 'Questo utente non ha un indirizzo e-mail valido.',
    errorGeneric: 'Impossibile inviare la proposta.',
  },
};

const ES: DomainEditUiText = {
  tabs: {config: 'Configuración', members: 'Miembros', audit: 'Actividad'},
  audit: {
    title: 'Registro de actividad',
    empty: 'No hay acciones registradas.',
    colWhen: 'Cuándo',
    colActor: 'Autor',
    colAction: 'Acción',
    colTarget: 'Objetivo',
    actionLabel: (action) => ES_ACTION_LABELS[action] ?? action,
    systemActor: 'sistema',
  },
  errors: {
    invalidId: 'Identificador no válido.',
    loadDomainFailed: 'No se puede cargar el dominio.',
    formInvalid: 'El formulario contiene errores.',
    needOneLanguage: 'Selecciona al menos un idioma válido.',
    saveFailed: 'Error al guardar.',
    translationFailed: 'Error al traducir.',
  },
  members: {
    pendingTitle: 'Solicitudes pendientes',
    pendingNone: 'Sin solicitudes pendientes.',
    pendingOpenModeration: 'Moderar las solicitudes',
    colUser: 'Usuario',
    colEmail: 'Correo',
    colRequestedAt: 'Solicitado el',
    colRole: 'Rol',
    colActions: 'Acciones',
    membersTitle: 'Miembros',
    membersNone: 'Sin miembros.',
    roleOwner: 'Propietario',
    roleManager: 'Gestor',
    roleMember: 'Miembro',
    promote: 'Promover a gestor',
    demote: 'Degradar a miembro',
    remove: 'Quitar del dominio',
    confirmRemoveHeader: '¿Quitar a este miembro?',
    confirmRemoveMessage: (username) => `¿Quitar a ${username} del dominio? Esta acción es inmediata.`,
    confirmRemoveAccept: 'Quitar',
    confirmRemoveCancel: 'Cancelar',
    actionFailed: 'La acción falló.',
    inviteButton: 'Invitar por correo',
    inviteDialogTitle: 'Invitar a nuevos miembros',
    inviteDialogHint: 'Introduce uno o más correos (separados por comas o saltos de línea).',
    inviteEmailsLabel: 'Correos electrónicos',
    inviteEmailsPlaceholder: 'alice@example.com, bob@example.com',
    inviteSubmit: 'Enviar invitaciones',
    inviteCancel: 'Cancelar',
    inviteResultSent: (email) => `${email}: invitación enviada.`,
    inviteResultAlreadyMember: (email) => `${email}: ya es miembro.`,
    inviteResultInvalid: (email) => `${email}: dirección no válida.`,
    inviteResultForbidden: (email) => `${email}: no puedes invitar a este dominio.`,
    inviteResultSummary: (sent, total) => `${sent} invitación${sent > 1 ? 'es enviadas' : ' enviada'} de ${total}.`,
    inviteAdditionalDomainsLabel: 'Invitar también a otros dominios',
    inviteAdditionalDomainsHint: 'Opcional. Las mismas direcciones recibirán una invitación para cada dominio elegido.',
    inviteAdditionalDomainsPlaceholder: 'Elige uno o más dominios…',
    inviteResultDomainPrefix: (domainName) => `[${domainName}]`,
    invitationsTitle: 'Invitaciones pendientes',
    invitationsEmpty: 'No hay invitaciones pendientes.',
    invitationsColEmail: 'Correo',
    invitationsColSentAt: 'Enviada el',
    invitationsColExpiresAt: 'Expira el',
    invitationResend: 'Reenviar',
    invitationRevoke: 'Revocar',
    invitationConfirmRevokeHeader: '¿Revocar esta invitación?',
    invitationConfirmRevokeMessage: (email) => `¿Revocar la invitación para ${email}? El enlace ya enviado dejará de funcionar.`,
    invitationConfirmRevokeAccept: 'Revocar',
    invitationConfirmRevokeCancel: 'Cancelar',
  },
  transfer: {
    button: 'Transferir la propiedad',
    dialogTitle: 'Transferir la propiedad del dominio',
    dialogHint: 'Elige el nuevo propietario. Se enviará un correo: la propiedad no cambia hasta que confirme.',
    pickPlaceholder: 'Selecciona un usuario',
    submit: 'Enviar la propuesta',
    sending: 'Enviando…',
    cancel: 'Cancelar',
    successMessage: 'Propuesta enviada. El futuro propietario recibirá un correo.',
    errorAlreadyOwner: 'Este usuario ya es el propietario.',
    errorTargetUnreachable: 'Este usuario no tiene una dirección de correo válida.',
    errorGeneric: 'No se puede enviar la propuesta.',
  },
};

const DICT: Record<LanguageEnumDto, DomainEditUiText> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
  [LanguageEnumDto.It]: IT,
  [LanguageEnumDto.Es]: ES,
};

export function getDomainEditUiText(
  lang: LanguageEnumDto | string | null | undefined,
): DomainEditUiText {
  return DICT[lang as LanguageEnumDto] ?? EN;
}
