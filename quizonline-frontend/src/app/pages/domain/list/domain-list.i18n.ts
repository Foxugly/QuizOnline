import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export type DomainListUiText = {
  title: string;
  searchPlaceholder: string;
  colName: string;
  colSubjects: string;
  colQuestions: string;
  colStatus: string;
  colPendingRequests: string;
  colActions: string;
  bulkPlaceholder: string;
  bulkApply: string;
  bulkActivate: string;
  bulkDeactivate: string;
  bulkDelete: string;
  bulkSelectedCount: (n: number) => string;
  bulkDeleteHeader: string;
  bulkDeleteConfirm: (n: number) => string;
  bulkConfirmCancel: string;
};

const FR: DomainListUiText = {
  title: 'Domaines',
  searchPlaceholder: 'Rechercher…',
  colName: 'Nom',
  colSubjects: 'Sujets',
  colQuestions: 'Questions',
  colStatus: 'Statut',
  colPendingRequests: 'Demandes',
  colActions: 'Actions',
  bulkPlaceholder: 'Actions groupées…',
  bulkApply: 'Appliquer',
  bulkActivate: 'Rendre actif',
  bulkDeactivate: 'Rendre inactif',
  bulkDelete: 'Supprimer',
  bulkSelectedCount: (n) => n <= 1 ? `${n} sélectionné` : `${n} sélectionnés`,
  bulkDeleteHeader: 'Supprimer',
  bulkDeleteConfirm: (n) => `Supprimer ${n} domaine${n > 1 ? 's' : ''} ? Cette action est irréversible.`,
  bulkConfirmCancel: 'Annuler',
};

const EN: DomainListUiText = {
  title: 'Domains',
  searchPlaceholder: 'Search…',
  colName: 'Name',
  colSubjects: 'Topics',
  colQuestions: 'Questions',
  colStatus: 'Status',
  colPendingRequests: 'Requests',
  colActions: 'Actions',
  bulkPlaceholder: 'Bulk actions…',
  bulkApply: 'Apply',
  bulkActivate: 'Make active',
  bulkDeactivate: 'Make inactive',
  bulkDelete: 'Delete',
  bulkSelectedCount: (n) => `${n} selected`,
  bulkDeleteHeader: 'Delete',
  bulkDeleteConfirm: (n) => `Delete ${n} domain${n > 1 ? 's' : ''}? This action is irreversible.`,
  bulkConfirmCancel: 'Cancel',
};

const NL: DomainListUiText = {
  title: 'Domeinen',
  searchPlaceholder: 'Zoeken…',
  colName: 'Naam',
  colSubjects: 'Onderwerpen',
  colQuestions: 'Vragen',
  colStatus: 'Status',
  colPendingRequests: 'Aanvragen',
  colActions: 'Acties',
  bulkPlaceholder: 'Bulkacties…',
  bulkApply: 'Toepassen',
  bulkActivate: 'Activeren',
  bulkDeactivate: 'Deactiveren',
  bulkDelete: 'Verwijderen',
  bulkSelectedCount: (n) => `${n} geselecteerd`,
  bulkDeleteHeader: 'Verwijderen',
  bulkDeleteConfirm: (n) => `${n} domein${n > 1 ? 'en' : ''} verwijderen? Deze actie is onomkeerbaar.`,
  bulkConfirmCancel: 'Annuleren',
};

const IT: DomainListUiText = {
  title: 'Domini',
  searchPlaceholder: 'Cerca…',
  colName: 'Nome',
  colSubjects: 'Argomenti',
  colQuestions: 'Domande',
  colStatus: 'Stato',
  colPendingRequests: 'Richieste',
  colActions: 'Azioni',
  bulkPlaceholder: 'Azioni in blocco…',
  bulkApply: 'Applica',
  bulkActivate: 'Attiva',
  bulkDeactivate: 'Disattiva',
  bulkDelete: 'Elimina',
  bulkSelectedCount: (n) => `${n} selezionat${n <= 1 ? 'o' : 'i'}`,
  bulkDeleteHeader: 'Elimina',
  bulkDeleteConfirm: (n) => `Eliminare ${n} domini${n > 1 ? '' : 'o'}? Questa azione è irreversibile.`,
  bulkConfirmCancel: 'Annulla',
};

const ES: DomainListUiText = {
  title: 'Dominios',
  searchPlaceholder: 'Buscar…',
  colName: 'Nombre',
  colSubjects: 'Temas',
  colQuestions: 'Preguntas',
  colStatus: 'Estado',
  colPendingRequests: 'Solicitudes',
  colActions: 'Acciones',
  bulkPlaceholder: 'Acciones masivas…',
  bulkApply: 'Aplicar',
  bulkActivate: 'Activar',
  bulkDeactivate: 'Desactivar',
  bulkDelete: 'Eliminar',
  bulkSelectedCount: (n) => `${n} seleccionado${n > 1 ? 's' : ''}`,
  bulkDeleteHeader: 'Eliminar',
  bulkDeleteConfirm: (n) => `¿Eliminar ${n} dominio${n > 1 ? 's' : ''}? Esta acción es irreversible.`,
  bulkConfirmCancel: 'Cancelar',
};

const DICT: Record<LanguageEnumDto, DomainListUiText> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
  [LanguageEnumDto.It]: IT,
  [LanguageEnumDto.Es]: ES,
};

export function getDomainListUiText(
  lang: LanguageEnumDto | string | null | undefined,
): DomainListUiText {
  return DICT[lang as LanguageEnumDto] ?? EN;
}
