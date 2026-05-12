import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export type DomainEditUiText = {
  tabs: {
    config: string;
    members: string;
    audit: string;
    analytics: string;
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
  analytics: {
    title: string;
    loading: string;
    empty: string;
    pendingCount: string;
    approvedCount: string;
    rejectedCount: string;
    cancelledCount: string;
    totalDecisions: string;
    acceptRate: string;
    acceptRateUnknown: string;
    medianDecision: string;
    medianDecisionUnknown: string;
    topDecidersTitle: string;
    topDecidersEmpty: string;
    colDecider: string;
    colDecisionCount: string;
    decisionsLabel: (n: number) => string;
    durationFormat: (totalSeconds: number) => string;
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
  tabs: {config: 'Configuration', members: 'Membres', audit: 'Journal', analytics: 'Statistiques'},
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
  analytics: {
    title: 'Statistiques des demandes d\'adhésion',
    loading: 'Chargement…',
    empty: 'Pas encore de données.',
    pendingCount: 'En attente',
    approvedCount: 'Approuvées',
    rejectedCount: 'Refusées',
    cancelledCount: 'Annulées',
    totalDecisions: 'Décisions totales',
    acceptRate: 'Taux d\'acceptation',
    acceptRateUnknown: '—',
    medianDecision: 'Temps médian avant décision',
    medianDecisionUnknown: '—',
    topDecidersTitle: 'Top modérateurs',
    topDecidersEmpty: 'Aucune décision enregistrée.',
    colDecider: 'Modérateur',
    colDecisionCount: 'Décisions',
    decisionsLabel: (n) => n <= 1 ? `${n} décision` : `${n} décisions`,
    durationFormat: (totalSeconds) => {
      const s = Math.max(0, Math.round(totalSeconds));
      if (s < 60) return `${s} s`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m} min`;
      const h = Math.floor(m / 60);
      const remM = m % 60;
      if (h < 24) return remM ? `${h} h ${remM} min` : `${h} h`;
      const d = Math.floor(h / 24);
      const remH = h % 24;
      return remH ? `${d} j ${remH} h` : `${d} j`;
    },
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
  tabs: {config: 'Configuration', members: 'Members', audit: 'Activity', analytics: 'Analytics'},
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
  analytics: {
    title: 'Join-request analytics',
    loading: 'Loading…',
    empty: 'No data yet.',
    pendingCount: 'Pending',
    approvedCount: 'Approved',
    rejectedCount: 'Rejected',
    cancelledCount: 'Cancelled',
    totalDecisions: 'Total decisions',
    acceptRate: 'Acceptance rate',
    acceptRateUnknown: '—',
    medianDecision: 'Median time to decision',
    medianDecisionUnknown: '—',
    topDecidersTitle: 'Top moderators',
    topDecidersEmpty: 'No decisions recorded yet.',
    colDecider: 'Moderator',
    colDecisionCount: 'Decisions',
    decisionsLabel: (n) => n <= 1 ? `${n} decision` : `${n} decisions`,
    durationFormat: (totalSeconds) => {
      const s = Math.max(0, Math.round(totalSeconds));
      if (s < 60) return `${s} s`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m} min`;
      const h = Math.floor(m / 60);
      const remM = m % 60;
      if (h < 24) return remM ? `${h} h ${remM} min` : `${h} h`;
      const d = Math.floor(h / 24);
      const remH = h % 24;
      return remH ? `${d} d ${remH} h` : `${d} d`;
    },
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
  tabs: {config: 'Configuratie', members: 'Leden', audit: 'Activiteit', analytics: 'Statistieken'},
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
  analytics: {
    title: 'Statistieken aanvragen',
    loading: 'Laden…',
    empty: 'Nog geen gegevens.',
    pendingCount: 'In afwachting',
    approvedCount: 'Goedgekeurd',
    rejectedCount: 'Afgewezen',
    cancelledCount: 'Geannuleerd',
    totalDecisions: 'Totaal beslissingen',
    acceptRate: 'Acceptatiepercentage',
    acceptRateUnknown: '—',
    medianDecision: 'Mediaan tot beslissing',
    medianDecisionUnknown: '—',
    topDecidersTitle: 'Top moderators',
    topDecidersEmpty: 'Nog geen beslissingen geregistreerd.',
    colDecider: 'Moderator',
    colDecisionCount: 'Beslissingen',
    decisionsLabel: (n) => n <= 1 ? `${n} beslissing` : `${n} beslissingen`,
    durationFormat: (totalSeconds) => {
      const s = Math.max(0, Math.round(totalSeconds));
      if (s < 60) return `${s} s`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m} min`;
      const h = Math.floor(m / 60);
      const remM = m % 60;
      if (h < 24) return remM ? `${h} u ${remM} min` : `${h} u`;
      const d = Math.floor(h / 24);
      const remH = h % 24;
      return remH ? `${d} d ${remH} u` : `${d} d`;
    },
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
  tabs: {config: 'Configurazione', members: 'Membri', audit: 'Attività', analytics: 'Statistiche'},
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
  analytics: {
    title: 'Statistiche delle richieste di adesione',
    loading: 'Caricamento…',
    empty: 'Ancora nessun dato.',
    pendingCount: 'In attesa',
    approvedCount: 'Approvate',
    rejectedCount: 'Rifiutate',
    cancelledCount: 'Annullate',
    totalDecisions: 'Decisioni totali',
    acceptRate: 'Tasso di accettazione',
    acceptRateUnknown: '—',
    medianDecision: 'Tempo mediano fino alla decisione',
    medianDecisionUnknown: '—',
    topDecidersTitle: 'Migliori moderatori',
    topDecidersEmpty: 'Nessuna decisione registrata.',
    colDecider: 'Moderatore',
    colDecisionCount: 'Decisioni',
    decisionsLabel: (n) => n <= 1 ? `${n} decisione` : `${n} decisioni`,
    durationFormat: (totalSeconds) => {
      const s = Math.max(0, Math.round(totalSeconds));
      if (s < 60) return `${s} s`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m} min`;
      const h = Math.floor(m / 60);
      const remM = m % 60;
      if (h < 24) return remM ? `${h} h ${remM} min` : `${h} h`;
      const d = Math.floor(h / 24);
      const remH = h % 24;
      return remH ? `${d} g ${remH} h` : `${d} g`;
    },
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
  tabs: {config: 'Configuración', members: 'Miembros', audit: 'Actividad', analytics: 'Estadísticas'},
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
  analytics: {
    title: 'Estadísticas de solicitudes de adhesión',
    loading: 'Cargando…',
    empty: 'Aún no hay datos.',
    pendingCount: 'Pendientes',
    approvedCount: 'Aprobadas',
    rejectedCount: 'Rechazadas',
    cancelledCount: 'Canceladas',
    totalDecisions: 'Decisiones totales',
    acceptRate: 'Tasa de aceptación',
    acceptRateUnknown: '—',
    medianDecision: 'Mediana hasta la decisión',
    medianDecisionUnknown: '—',
    topDecidersTitle: 'Mejores moderadores',
    topDecidersEmpty: 'Aún no hay decisiones registradas.',
    colDecider: 'Moderador',
    colDecisionCount: 'Decisiones',
    decisionsLabel: (n) => n <= 1 ? `${n} decisión` : `${n} decisiones`,
    durationFormat: (totalSeconds) => {
      const s = Math.max(0, Math.round(totalSeconds));
      if (s < 60) return `${s} s`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m} min`;
      const h = Math.floor(m / 60);
      const remM = m % 60;
      if (h < 24) return remM ? `${h} h ${remM} min` : `${h} h`;
      const d = Math.floor(h / 24);
      const remH = h % 24;
      return remH ? `${d} d ${remH} h` : `${d} d`;
    },
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
