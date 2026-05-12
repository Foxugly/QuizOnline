import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export type DomainEditUiText = {
  tabs: {
    config: string;
    members: string;
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
