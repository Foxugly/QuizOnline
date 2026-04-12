import { LanguageEnumDto } from '../../../api/generated';

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
};

const EN: QuestionListUiText = {
  title: 'Questions',
  subtitle: 'Search, list and actions',
  searchPlaceholder: 'Search...',
  subjectsPlaceholder: 'Filter by subjects',
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
  subjectsCol: 'Subjects',
  actionsCol: 'Actions',
  practice: 'Practice',
  exam: 'Exam',
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
