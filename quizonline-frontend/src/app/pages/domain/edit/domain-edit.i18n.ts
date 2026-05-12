import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export type DomainEditUiText = {
  tabs: {
    config: string;
    members: string;
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
    inviteResultSummary: (sent: number, total: number) => string;
  };
};

const FR: DomainEditUiText = {
  tabs: {config: 'Configuration', members: 'Membres'},
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
    inviteResultSummary: (sent, total) => `${sent} invitation${sent > 1 ? 's' : ''} envoyée${sent > 1 ? 's' : ''} sur ${total}.`,
  },
};

const EN: DomainEditUiText = {
  tabs: {config: 'Configuration', members: 'Members'},
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
    inviteResultSummary: (sent, total) => `${sent} invitation${sent > 1 ? 's' : ''} sent out of ${total}.`,
  },
};

const NL: DomainEditUiText = {
  tabs: {config: 'Configuratie', members: 'Leden'},
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
    inviteResultSummary: (sent, total) => `${sent} van ${total} uitnodigingen verzonden.`,
  },
};

const IT: DomainEditUiText = {
  tabs: {config: 'Configurazione', members: 'Membri'},
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
    confirmRemoveMessage: (username) => `Rimuovere ${username} dal dominio? L\'operazione è immediata.`,
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
    inviteResultSummary: (sent, total) => `${sent} invit${sent > 1 ? 'i inviati' : 'o inviato'} su ${total}.`,
  },
};

const ES: DomainEditUiText = {
  tabs: {config: 'Configuración', members: 'Miembros'},
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
    inviteResultSummary: (sent, total) => `${sent} invitación${sent > 1 ? 'es enviadas' : ' enviada'} de ${total}.`,
  },
};

const DICT: Record<LanguageEnumDto, DomainEditUiText> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
  [LanguageEnumDto.It]: IT,
  [LanguageEnumDto.Es]: ES,
};

export function getDomainEditUiText(lang: LanguageEnumDto): DomainEditUiText {
  return DICT[lang] ?? EN;
}
