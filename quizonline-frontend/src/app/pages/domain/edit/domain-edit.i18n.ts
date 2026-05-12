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
    membersTitle: string;
    membersNone: string;
    roleOwner: string;
    roleManager: string;
    roleMember: string;
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
    membersTitle: 'Membres',
    membersNone: 'Aucun membre.',
    roleOwner: 'Propriétaire',
    roleManager: 'Gestionnaire',
    roleMember: 'Membre',
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
    membersTitle: 'Members',
    membersNone: 'No member.',
    roleOwner: 'Owner',
    roleManager: 'Manager',
    roleMember: 'Member',
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
    membersTitle: 'Leden',
    membersNone: 'Geen lid.',
    roleOwner: 'Eigenaar',
    roleManager: 'Beheerder',
    roleMember: 'Lid',
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
    membersTitle: 'Membri',
    membersNone: 'Nessun membro.',
    roleOwner: 'Proprietario',
    roleManager: 'Gestore',
    roleMember: 'Membro',
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
    membersTitle: 'Miembros',
    membersNone: 'Sin miembros.',
    roleOwner: 'Propietario',
    roleManager: 'Gestor',
    roleMember: 'Miembro',
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
