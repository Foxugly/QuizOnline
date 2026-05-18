import { LanguageEnumDto } from '../../../api/generated/model/language-enum';

export type QuestionListUiText = {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  subjectsPlaceholder: string;
  newQuestion: string;
  importQuestions: string;
  exportQuestions: string;
  exportSelected: (n: number) => string;
  selectAll: string;
  unselectAll: string;
  titleCol: string;
  activeCol: string;
  modesCol: string;
  domainsCol: string;
  subjectsCol: string;
  actionsCol: string;
  practice: string;
  exam: string;
  bulkPlaceholder: string;
  bulkApply: string;
  bulkExport: string;
  bulkActivate: string;
  bulkDeactivate: string;
  bulkAddPractice: string;
  bulkRemovePractice: string;
  bulkAddExam: string;
  bulkRemoveExam: string;
  bulkDelete: string;
  bulkSelectedCount: (n: number) => string;
  bulkDeleteConfirm: (n: number) => string;
  bulkConfirmCancel: string;
};

const FR: QuestionListUiText = {
  title: 'Questions',
  subtitle: 'Recherche, liste et actions',
  searchPlaceholder: 'Rechercher...',
  subjectsPlaceholder: 'Filtrer par sujets',
  newQuestion: 'Nouveau',
  importQuestions: 'Importer',
  exportQuestions: 'Exporter',
  exportSelected: (n) => `Exporter (${n})`,
  selectAll: 'Tout cocher',
  unselectAll: 'Tout décocher',
  titleCol: 'Titre',
  activeCol: 'Actif',
  modesCol: 'Modes',
  domainsCol: 'Domaines',
  subjectsCol: 'Sujets',
  actionsCol: 'Actions',
  practice: 'Pratique',
  exam: 'Examen',
  bulkPlaceholder: 'Actions groupées…',
  bulkApply: 'Appliquer',
  bulkExport: 'Exporter',
  bulkActivate: 'Rendre actif',
  bulkDeactivate: 'Rendre inactif',
  bulkAddPractice: 'Ajouter mode pratique',
  bulkRemovePractice: 'Retirer mode pratique',
  bulkAddExam: 'Ajouter mode examen',
  bulkRemoveExam: 'Retirer mode examen',
  bulkDelete: 'Supprimer',
  bulkSelectedCount: (n) => n <= 1 ? `${n} sélectionnée` : `${n} sélectionnées`,
  bulkDeleteConfirm: (n) => `Supprimer ${n} question${n > 1 ? 's' : ''} ? Cette action est irréversible.`,
  bulkConfirmCancel: 'Annuler',
};

const EN: QuestionListUiText = {
  title: 'Questions',
  subtitle: 'Search, list and actions',
  searchPlaceholder: 'Search...',
  subjectsPlaceholder: 'Filter by topics',
  newQuestion: 'New',
  importQuestions: 'Import',
  exportQuestions: 'Export',
  exportSelected: (n) => `Export (${n})`,
  selectAll: 'Select all',
  unselectAll: 'Deselect all',
  titleCol: 'Title',
  activeCol: 'Active',
  modesCol: 'Modes',
  domainsCol: 'Domains',
  subjectsCol: 'Topics',
  actionsCol: 'Actions',
  practice: 'Practice',
  exam: 'Exam',
  bulkPlaceholder: 'Bulk actions…',
  bulkApply: 'Apply',
  bulkExport: 'Export',
  bulkActivate: 'Set active',
  bulkDeactivate: 'Set inactive',
  bulkAddPractice: 'Add practice mode',
  bulkRemovePractice: 'Remove practice mode',
  bulkAddExam: 'Add exam mode',
  bulkRemoveExam: 'Remove exam mode',
  bulkDelete: 'Delete',
  bulkSelectedCount: (n) => `${n} selected`,
  bulkDeleteConfirm: (n) => `Delete ${n} question${n > 1 ? 's' : ''}? This cannot be undone.`,
  bulkConfirmCancel: 'Cancel',
};

const NL: QuestionListUiText = {
  title: 'Vragen',
  subtitle: 'Zoeken, lijst en acties',
  searchPlaceholder: 'Zoeken...',
  subjectsPlaceholder: 'Filter op onderwerpen',
  newQuestion: 'Nieuw',
  importQuestions: 'Importeren',
  exportQuestions: 'Exporteren',
  exportSelected: (n) => `Exporteren (${n})`,
  selectAll: 'Alles selecteren',
  unselectAll: 'Alles deselecteren',
  titleCol: 'Titel',
  activeCol: 'Actief',
  modesCol: 'Modi',
  domainsCol: 'Domeinen',
  subjectsCol: 'Onderwerpen',
  actionsCol: 'Acties',
  practice: 'Oefening',
  exam: 'Examen',
  bulkPlaceholder: 'Bulkacties…',
  bulkApply: 'Toepassen',
  bulkExport: 'Exporteren',
  bulkActivate: 'Activeren',
  bulkDeactivate: 'Deactiveren',
  bulkAddPractice: 'Oefenmodus toevoegen',
  bulkRemovePractice: 'Oefenmodus verwijderen',
  bulkAddExam: 'Examenmodus toevoegen',
  bulkRemoveExam: 'Examenmodus verwijderen',
  bulkDelete: 'Verwijderen',
  bulkSelectedCount: (n) => `${n} geselecteerd`,
  bulkDeleteConfirm: (n) => `${n} vragen verwijderen? Dit kan niet ongedaan worden gemaakt.`,
  bulkConfirmCancel: 'Annuleren',
};

const IT: QuestionListUiText = {
  title: 'Domande',
  subtitle: 'Ricerca, elenco e azioni',
  searchPlaceholder: 'Cerca...',
  subjectsPlaceholder: 'Filtra per argomenti',
  newQuestion: 'Nuovo',
  importQuestions: 'Importa',
  exportQuestions: 'Esporta',
  exportSelected: (n) => `Esporta (${n})`,
  selectAll: 'Seleziona tutto',
  unselectAll: 'Deseleziona tutto',
  titleCol: 'Titolo',
  activeCol: 'Attiva',
  modesCol: 'Modalita',
  domainsCol: 'Domini',
  subjectsCol: 'Argomenti',
  actionsCol: 'Azioni',
  practice: 'Pratica',
  exam: 'Esame',
  bulkPlaceholder: 'Azioni multiple…',
  bulkApply: 'Applica',
  bulkExport: 'Esporta',
  bulkActivate: 'Attiva',
  bulkDeactivate: 'Disattiva',
  bulkAddPractice: 'Aggiungi modalità pratica',
  bulkRemovePractice: 'Rimuovi modalità pratica',
  bulkAddExam: 'Aggiungi modalità esame',
  bulkRemoveExam: 'Rimuovi modalità esame',
  bulkDelete: 'Elimina',
  bulkSelectedCount: (n) => n <= 1 ? `${n} selezionata` : `${n} selezionate`,
  bulkDeleteConfirm: (n) => `Eliminare ${n} domand${n > 1 ? 'e' : 'a'}? L'operazione è irreversibile.`,
  bulkConfirmCancel: 'Annulla',
};

const ES: QuestionListUiText = {
  title: 'Preguntas',
  subtitle: 'Busqueda, lista y acciones',
  searchPlaceholder: 'Buscar...',
  subjectsPlaceholder: 'Filtrar por temas',
  newQuestion: 'Nuevo',
  importQuestions: 'Importar',
  exportQuestions: 'Exportar',
  exportSelected: (n) => `Exportar (${n})`,
  selectAll: 'Seleccionar todo',
  unselectAll: 'Deseleccionar todo',
  titleCol: 'Titulo',
  activeCol: 'Activo',
  modesCol: 'Modos',
  domainsCol: 'Dominios',
  subjectsCol: 'Temas',
  actionsCol: 'Acciones',
  practice: 'Practica',
  exam: 'Examen',
  bulkPlaceholder: 'Acciones masivas…',
  bulkApply: 'Aplicar',
  bulkExport: 'Exportar',
  bulkActivate: 'Activar',
  bulkDeactivate: 'Desactivar',
  bulkAddPractice: 'Añadir modo práctica',
  bulkRemovePractice: 'Quitar modo práctica',
  bulkAddExam: 'Añadir modo examen',
  bulkRemoveExam: 'Quitar modo examen',
  bulkDelete: 'Eliminar',
  bulkSelectedCount: (n) => n <= 1 ? `${n} seleccionada` : `${n} seleccionadas`,
  bulkDeleteConfirm: (n) => `¿Eliminar ${n} pregunta${n > 1 ? 's' : ''}? Esta acción es irreversible.`,
  bulkConfirmCancel: 'Cancelar',
};

const UI_TEXT: Partial<Record<LanguageEnumDto, QuestionListUiText>> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
  [LanguageEnumDto.It]: IT,
  [LanguageEnumDto.Es]: ES,
};

export function getQuestionListUiText(lang: LanguageEnumDto | string | null | undefined): QuestionListUiText {
  return UI_TEXT[lang as LanguageEnumDto] ?? EN;
}
