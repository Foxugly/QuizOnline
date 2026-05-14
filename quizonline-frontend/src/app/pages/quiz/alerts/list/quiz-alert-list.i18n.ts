import {LanguageEnumDto} from '../../../../api/generated/model/language-enum';

export type QuizAlertListUiText = {
  title: string;
  searchPlaceholder: string;
  loading: string;
  statusOptions: {all: string; open: string; closed: string};
  readOptions: {all: string; unread: string; read: string};
  topicQuiz: string;
  questionPrefix: (id: number) => string;
  questionOrder: (order: number) => string;
  status: {open: string; closed: string; unread: string};
  empty: {title: string; hint: string};
  noMessage: string;
  assignmentPreview: (title: string) => string;
  assignmentPreviewWithIntro: (intro: string, title: string) => string;
};

const FR: QuizAlertListUiText = {
  title: 'Messages quiz',
  searchPlaceholder: 'Rechercher dans les messages…',
  loading: 'Chargement des messages…',
  statusOptions: {all: 'Tous', open: 'Ouverts', closed: 'Fermés'},
  readOptions: {all: 'Tous', unread: 'Non lus', read: 'Lus'},
  topicQuiz: 'Quiz',
  questionPrefix: (id) => `Question #${id}`,
  questionOrder: (order) => `#${order}`,
  status: {open: 'Ouverte', closed: 'Fermée', unread: 'Non lu'},
  empty: {
    title: 'Aucun message',
    hint: 'Aucun message ne correspond au filtre actif.',
  },
  noMessage: 'Aucun message.',
  assignmentPreview: (title) => `Un nouveau quiz vous a été assigné : ${title}`,
  assignmentPreviewWithIntro: (intro, title) => `${intro} : ${title}`,
};

const EN: QuizAlertListUiText = {
  title: 'Quiz messages',
  searchPlaceholder: 'Search messages…',
  loading: 'Loading messages…',
  statusOptions: {all: 'All', open: 'Open', closed: 'Closed'},
  readOptions: {all: 'All', unread: 'Unread', read: 'Read'},
  topicQuiz: 'Quiz',
  questionPrefix: (id) => `Question #${id}`,
  questionOrder: (order) => `#${order}`,
  status: {open: 'Open', closed: 'Closed', unread: 'Unread'},
  empty: {
    title: 'No messages',
    hint: 'No message matches the active filter.',
  },
  noMessage: 'No message.',
  assignmentPreview: (title) => `A new quiz has been assigned to you: ${title}`,
  assignmentPreviewWithIntro: (intro, title) => `${intro}: ${title}`,
};

const NL: QuizAlertListUiText = {
  title: 'Quizberichten',
  searchPlaceholder: 'Berichten doorzoeken…',
  loading: 'Berichten worden geladen…',
  statusOptions: {all: 'Alle', open: 'Open', closed: 'Gesloten'},
  readOptions: {all: 'Alle', unread: 'Ongelezen', read: 'Gelezen'},
  topicQuiz: 'Quiz',
  questionPrefix: (id) => `Vraag #${id}`,
  questionOrder: (order) => `#${order}`,
  status: {open: 'Open', closed: 'Gesloten', unread: 'Ongelezen'},
  empty: {
    title: 'Geen berichten',
    hint: 'Geen bericht komt overeen met het actieve filter.',
  },
  noMessage: 'Geen bericht.',
  assignmentPreview: (title) => `Een nieuwe quiz is aan u toegewezen: ${title}`,
  assignmentPreviewWithIntro: (intro, title) => `${intro}: ${title}`,
};

const IT: QuizAlertListUiText = {
  title: 'Messaggi quiz',
  searchPlaceholder: 'Cerca nei messaggi…',
  loading: 'Caricamento messaggi…',
  statusOptions: {all: 'Tutti', open: 'Aperti', closed: 'Chiusi'},
  readOptions: {all: 'Tutti', unread: 'Non letti', read: 'Letti'},
  topicQuiz: 'Quiz',
  questionPrefix: (id) => `Domanda #${id}`,
  questionOrder: (order) => `#${order}`,
  status: {open: 'Aperta', closed: 'Chiusa', unread: 'Non letta'},
  empty: {
    title: 'Nessun messaggio',
    hint: 'Nessun messaggio corrisponde al filtro attivo.',
  },
  noMessage: 'Nessun messaggio.',
  assignmentPreview: (title) => `Ti è stato assegnato un nuovo quiz: ${title}`,
  assignmentPreviewWithIntro: (intro, title) => `${intro}: ${title}`,
};

const ES: QuizAlertListUiText = {
  title: 'Mensajes del cuestionario',
  searchPlaceholder: 'Buscar mensajes…',
  loading: 'Cargando mensajes…',
  statusOptions: {all: 'Todos', open: 'Abiertos', closed: 'Cerrados'},
  readOptions: {all: 'Todos', unread: 'No leídos', read: 'Leídos'},
  topicQuiz: 'Cuestionario',
  questionPrefix: (id) => `Pregunta #${id}`,
  questionOrder: (order) => `#${order}`,
  status: {open: 'Abierto', closed: 'Cerrado', unread: 'No leído'},
  empty: {
    title: 'Sin mensajes',
    hint: 'Ningún mensaje coincide con el filtro activo.',
  },
  noMessage: 'Sin mensajes.',
  assignmentPreview: (title) => `Se te ha asignado un nuevo cuestionario: ${title}`,
  assignmentPreviewWithIntro: (intro, title) => `${intro}: ${title}`,
};

const DICT: Record<LanguageEnumDto, QuizAlertListUiText> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
  [LanguageEnumDto.It]: IT,
  [LanguageEnumDto.Es]: ES,
};

export function getQuizAlertListUiText(lang: LanguageEnumDto | string | null | undefined): QuizAlertListUiText {
  return DICT[(lang as LanguageEnumDto) ?? LanguageEnumDto.En] ?? EN;
}
