import { LanguageEnumDto } from '../../../api/generated/model/language-enum';

export type QuizListUiText = {
  page: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    compose: string;
    quickCreate: string;
  };
  tabs: {
    templates: string;
    sessions: string;
  };
  templates: {
    empty: string;
    headers: {
      title: string;
      mode: string;
      questions: string;
      createdAt: string;
      owner: string;
      public: string;
      active: string;
      available: string;
      availabilityWindow: string;
      actions: string;
    };
    modePractice: string;
    modeExam: string;
    permanent: string;
    yes: string;
    no: string;
    actions: {
      start: string;
      startDisabledNotYet: (when: string) => string;
      startDisabledExpired: (when: string) => string;
      startDisabledGeneric: string;
      assign: string;
      results: string;
      edit: string;
      delete: string;
    };
  };
  assignDialog: {
    header: string;
    intro: string;
    noRecipients: string;
    searchPlaceholder: string;
    selectAll: string;
    clearSelection: string;
    roleAll: string;
    submit: string;
    cancel: string;
    roleOwner: string;
    roleManager: string;
    roleMember: string;
  };
  bulk: {
    placeholder: string;
    apply: string;
    activate: string;
    deactivate: string;
    delete: string;
    selectedCount: (n: number) => string;
  };
  messages: {
    assignSuccess: (count: number) => string;
    assignError: string;
    loadError: string;
    resultsError: string;
    createError: string;
    pendingApprovalBanner: (domains: string) => string;
  };
  welcome: {
    title: string;
    hint: string;
    stepSubjectTitle: string;
    stepSubjectHint: string;
    stepQuestionTitle: string;
    stepQuestionHint: string;
    stepQuizTitle: string;
    stepQuizHint: string;
    ctaSubject: string;
    ctaQuestion: string;
    ctaQuiz: string;
  };
};

const FR: QuizListUiText = {
  page: {
    title: 'Quiz',
    subtitle: 'Recherche, templates et sessions',
    searchPlaceholder: 'Rechercher...',
    compose: 'Nouveau template',
    quickCreate: 'Rapide',
  },
  tabs: { templates: 'Templates', sessions: 'Mes quiz' },
  templates: {
    empty: 'Aucun template visible.',
    headers: {
      title: 'Titre',
      mode: 'Mode',
      questions: 'Questions',
      createdAt: 'Créé le',
      owner: 'Owner',
      public: 'Public',
      active: 'Actif',
      available: 'Disponible',
      availabilityWindow: 'Disponibilité',
      actions: 'Actions',
    },
    modePractice: 'Pratique',
    modeExam: 'Examen',
    permanent: 'Permanent',
    yes: 'Oui',
    no: 'Non',
    actions: {
      start: 'Commencer ce quiz',
      startDisabledNotYet: (when) => `Pas encore disponible (ouvre le ${when})`,
      startDisabledExpired: (when) => `Disponibilité expirée le ${when}`,
      startDisabledGeneric: 'Indisponible actuellement',
      assign: 'Envoyer ce quiz à un utilisateur lié au domaine',
      results: 'Voir les résultats des quiz envoyés',
      edit: 'Modifier ce template',
      delete: 'Supprimer ce template',
    },
  },
  assignDialog: {
    header: 'Envoyer le quiz',
    intro: 'Sélectionne une ou plusieurs personnes liées à ce domaine pour leur envoyer',
    noRecipients: 'Aucun autre utilisateur lié à ce domaine.',
    searchPlaceholder: 'Filtrer par nom',
    selectAll: 'Tout sélectionner',
    clearSelection: 'Tout désélectionner',
    roleAll: 'Tous les rôles',
    submit: 'Envoyer',
    cancel: 'Annuler',
    roleOwner: 'Propriétaire',
    roleManager: 'Gestionnaire',
    roleMember: 'Membre lié',
  },
  bulk: {
    placeholder: 'Actions groupées…',
    apply: 'Appliquer',
    activate: 'Rendre actif',
    deactivate: 'Rendre inactif',
    delete: 'Supprimer',
    selectedCount: (n) => n <= 1 ? `${n} sélectionné` : `${n} sélectionnés`,
  },
  messages: {
    assignSuccess: (count) => `${count} quiz envoyé(s).`,
    assignError: 'Impossible d envoyer ce quiz.',
    loadError: 'Impossible de charger les quiz.',
    resultsError: 'Impossible de charger les résultats.',
    createError: 'Impossible de créer ce quiz.',
    pendingApprovalBanner: (domains: string) => `En attente de validation pour : ${domains}. Les quiz de ces domaines apparaîtront une fois votre accès approuvé.`,
  },
  welcome: {
    title: 'Bienvenue, composons votre premier quiz',
    hint: 'Trois étapes pour démarrer. Vous pouvez les enchaîner ou y revenir plus tard.',
    stepSubjectTitle: '1. Créer un sujet',
    stepSubjectHint: 'Regroupez vos questions par thème — un sujet par chapitre, par compétence, etc.',
    stepQuestionTitle: '2. Ajouter une question',
    stepQuestionHint: 'Texte, image ou vidéo. Plusieurs réponses possibles, et une explication facultative.',
    stepQuizTitle: '3. Composer un quiz',
    stepQuizHint: 'Sélectionnez vos questions, ajustez l’ordre et la pondération, puis activez le quiz.',
    ctaSubject: 'Créer un sujet',
    ctaQuestion: 'Ajouter une question',
    ctaQuiz: 'Composer un quiz',
  },
};

const EN: QuizListUiText = {
  page: {
    title: 'Quizzes',
    subtitle: 'Search, templates and sessions',
    searchPlaceholder: 'Search...',
    compose: 'New template',
    quickCreate: 'Quick',
  },
  tabs: { templates: 'Templates', sessions: 'My quizzes' },
  templates: {
    empty: 'No visible template.',
    headers: {
      title: 'Title',
      mode: 'Mode',
      questions: 'Questions',
      createdAt: 'Created at',
      owner: 'Owner',
      public: 'Public',
      active: 'Active',
      available: 'Available',
      availabilityWindow: 'Availability',
      actions: 'Actions',
    },
    modePractice: 'Practice',
    modeExam: 'Exam',
    permanent: 'Permanent',
    yes: 'Yes',
    no: 'No',
    actions: {
      start: 'Start this quiz',
      startDisabledNotYet: (when) => `Not yet available (opens on ${when})`,
      startDisabledExpired: (when) => `No longer available (closed on ${when})`,
      startDisabledGeneric: 'Not available right now',
      assign: 'Send this quiz to a user linked to the domain',
      results: 'View results for assigned quizzes',
      edit: 'Edit this template',
      delete: 'Delete this template',
    },
  },
  assignDialog: {
    header: 'Send quiz',
    intro: 'Select one or more people linked to this domain to send',
    noRecipients: 'No other user is linked to this domain.',
    searchPlaceholder: 'Filter by name',
    selectAll: 'Select all',
    clearSelection: 'Clear selection',
    roleAll: 'All roles',
    submit: 'Send',
    cancel: 'Cancel',
    roleOwner: 'Owner',
    roleManager: 'Manager',
    roleMember: 'Linked member',
  },
  bulk: {
    placeholder: 'Bulk actions…',
    apply: 'Apply',
    activate: 'Make active',
    deactivate: 'Make inactive',
    delete: 'Delete',
    selectedCount: (n) => `${n} selected`,
  },
  messages: {
    assignSuccess: (count) => `${count} quiz(es) sent.`,
    assignError: 'Unable to send this quiz.',
    loadError: 'Unable to load quizzes.',
    resultsError: 'Unable to load results.',
    createError: 'Unable to create this quiz.',
    pendingApprovalBanner: (domains: string) => `Pending approval for: ${domains}. Quizzes from these domains will appear once your access is approved.`,
  },
  welcome: {
    title: "Welcome — let's build your first quiz",
    hint: 'Three steps to get started. Walk through them in one go, or come back later.',
    stepSubjectTitle: '1. Create a topic',
    stepSubjectHint: 'Group your questions by theme — one topic per chapter, per skill, …',
    stepQuestionTitle: '2. Add a question',
    stepQuestionHint: 'Text, image or video. Multiple answers welcome, optional explanation.',
    stepQuizTitle: '3. Compose a quiz',
    stepQuizHint: 'Pick your questions, tune the order and weights, then activate the quiz.',
    ctaSubject: 'Create a topic',
    ctaQuestion: 'Add a question',
    ctaQuiz: 'Compose a quiz',
  },
};

const NL: QuizListUiText = {
  page: {
    title: 'Quizzen',
    subtitle: 'Zoeken, templates en sessies',
    searchPlaceholder: 'Zoeken...',
    compose: 'Nieuw template',
    quickCreate: 'Snel',
  },
  tabs: { templates: 'Templates', sessions: 'Mijn quizzen' },
  templates: {
    empty: 'Geen zichtbaar template.',
    headers: {
      title: 'Titel',
      mode: 'Modus',
      questions: 'Vragen',
      createdAt: 'Aangemaakt op',
      owner: 'Owner',
      public: 'Publiek',
      active: 'Actief',
      available: 'Beschikbaar',
      availabilityWindow: 'Beschikbaarheid',
      actions: 'Acties',
    },
    modePractice: 'Praktijk',
    modeExam: 'Examen',
    permanent: 'Permanent',
    yes: 'Ja',
    no: 'Nee',
    actions: {
      start: 'Deze quiz starten',
      startDisabledNotYet: (when) => `Nog niet beschikbaar (opent op ${when})`,
      startDisabledExpired: (when) => `Niet meer beschikbaar (gesloten op ${when})`,
      startDisabledGeneric: 'Momenteel niet beschikbaar',
      assign: 'Deze quiz naar een gebruiker sturen die aan het domein gekoppeld is',
      results: 'Resultaten van verzonden quizzen bekijken',
      edit: 'Dit template bewerken',
      delete: 'Dit template verwijderen',
    },
  },
  assignDialog: {
    header: 'Quiz verzenden',
    intro: 'Selecteer een of meer personen die aan dit domein gekoppeld zijn om',
    noRecipients: 'Geen andere gebruiker gekoppeld aan dit domein.',
    searchPlaceholder: 'Filter op naam',
    selectAll: 'Alles selecteren',
    clearSelection: 'Selectie wissen',
    roleAll: 'Alle rollen',
    submit: 'Verzenden',
    cancel: 'Annuleren',
    roleOwner: 'Eigenaar',
    roleManager: 'Beheerder',
    roleMember: 'Gekoppeld lid',
  },
  bulk: {
    placeholder: 'Bulkacties…',
    apply: 'Toepassen',
    activate: 'Activeren',
    deactivate: 'Deactiveren',
    delete: 'Verwijderen',
    selectedCount: (n) => `${n} geselecteerd`,
  },
  messages: {
    assignSuccess: (count) => `${count} quiz(zen) verzonden.`,
    assignError: 'Kan deze quiz niet verzenden.',
    loadError: 'Kan quizzen niet laden.',
    resultsError: 'Kan resultaten niet laden.',
    createError: 'Kan deze quiz niet maken.',
    pendingApprovalBanner: (domains: string) => `In afwachting van goedkeuring voor: ${domains}. Quizzen uit deze domeinen verschijnen zodra je toegang is goedgekeurd.`,
  },
  welcome: {
    title: 'Welkom — laten we je eerste quiz bouwen',
    hint: 'Drie stappen om te starten. Doorloop ze in een keer of kom later terug.',
    stepSubjectTitle: '1. Maak een onderwerp aan',
    stepSubjectHint: 'Groepeer je vragen per thema — een onderwerp per hoofdstuk, per vaardigheid, …',
    stepQuestionTitle: '2. Voeg een vraag toe',
    stepQuestionHint: 'Tekst, afbeelding of video. Meerdere antwoorden mogelijk, optionele toelichting.',
    stepQuizTitle: '3. Stel een quiz samen',
    stepQuizHint: 'Kies je vragen, pas volgorde en gewicht aan, activeer dan de quiz.',
    ctaSubject: 'Onderwerp maken',
    ctaQuestion: 'Vraag toevoegen',
    ctaQuiz: 'Quiz samenstellen',
  },
};

const IT: QuizListUiText = {
  page: {
    title: 'Quiz',
    subtitle: 'Ricerca, template e sessioni',
    searchPlaceholder: 'Cerca...',
    compose: 'Nuovo template',
    quickCreate: 'Rapido',
  },
  tabs: { templates: 'Template', sessions: 'I miei quiz' },
  templates: {
    empty: 'Nessun template visibile.',
    headers: {
      title: 'Titolo',
      mode: 'Modalita',
      questions: 'Domande',
      createdAt: 'Creato il',
      owner: 'Owner',
      public: 'Pubblico',
      active: 'Attivo',
      available: 'Disponibile',
      availabilityWindow: 'Disponibilita',
      actions: 'Azioni',
    },
    modePractice: 'Pratica',
    modeExam: 'Esame',
    permanent: 'Permanente',
    yes: 'Si',
    no: 'No',
    actions: {
      start: 'Avvia questo quiz',
      startDisabledNotYet: (when) => `Non ancora disponibile (apre il ${when})`,
      startDisabledExpired: (when) => `Non più disponibile (chiuso il ${when})`,
      startDisabledGeneric: 'Non disponibile al momento',
      assign: 'Invia questo quiz a un utente collegato al dominio',
      results: 'Vedi i risultati dei quiz inviati',
      edit: 'Modifica questo template',
      delete: 'Elimina questo template',
    },
  },
  assignDialog: {
    header: 'Invia quiz',
    intro: 'Seleziona una o piu persone collegate a questo dominio per inviare',
    noRecipients: 'Nessun altro utente collegato a questo dominio.',
    searchPlaceholder: 'Filtra per nome',
    selectAll: 'Seleziona tutto',
    clearSelection: 'Deseleziona tutto',
    roleAll: 'Tutti i ruoli',
    submit: 'Invia',
    cancel: 'Annulla',
    roleOwner: 'Proprietario',
    roleManager: 'Gestore',
    roleMember: 'Membro collegato',
  },
  bulk: {
    placeholder: 'Azioni in blocco…',
    apply: 'Applica',
    activate: 'Attiva',
    deactivate: 'Disattiva',
    delete: 'Elimina',
    selectedCount: (n) => `${n} selezionat${n <= 1 ? 'o' : 'i'}`,
  },
  messages: {
    assignSuccess: (count) => `${count} quiz inviato/i.`,
    assignError: 'Impossibile inviare questo quiz.',
    loadError: 'Impossibile caricare i quiz.',
    resultsError: 'Impossibile caricare i risultati.',
    createError: 'Impossibile creare questo quiz.',
    pendingApprovalBanner: (domains: string) => `In attesa di approvazione per: ${domains}. I quiz di questi domini appariranno una volta che il tuo accesso sarà approvato.`,
  },
  welcome: {
    title: 'Benvenuto — costruiamo il tuo primo quiz',
    hint: 'Tre passaggi per iniziare. Falli di seguito o torna più tardi.',
    stepSubjectTitle: '1. Crea una materia',
    stepSubjectHint: 'Raggruppa le tue domande per tema — una materia per capitolo, per competenza, …',
    stepQuestionTitle: '2. Aggiungi una domanda',
    stepQuestionHint: 'Testo, immagine o video. Più risposte possibili, spiegazione facoltativa.',
    stepQuizTitle: '3. Componi un quiz',
    stepQuizHint: 'Scegli le domande, regola ordine e pesi, poi attiva il quiz.',
    ctaSubject: 'Crea una materia',
    ctaQuestion: 'Aggiungi una domanda',
    ctaQuiz: 'Componi un quiz',
  },
};

const ES: QuizListUiText = {
  page: {
    title: 'Cuestionarios',
    subtitle: 'Busqueda, plantillas y sesiones',
    searchPlaceholder: 'Buscar...',
    compose: 'Nueva plantilla',
    quickCreate: 'Rapido',
  },
  tabs: { templates: 'Plantillas', sessions: 'Mis cuestionarios' },
  templates: {
    empty: 'No hay plantillas visibles.',
    headers: {
      title: 'Titulo',
      mode: 'Modo',
      questions: 'Preguntas',
      createdAt: 'Creado el',
      owner: 'Owner',
      public: 'Publico',
      active: 'Activo',
      available: 'Disponible',
      availabilityWindow: 'Disponibilidad',
      actions: 'Acciones',
    },
    modePractice: 'Practica',
    modeExam: 'Examen',
    permanent: 'Permanente',
    yes: 'Si',
    no: 'No',
    actions: {
      start: 'Iniciar este cuestionario',
      startDisabledNotYet: (when) => `Aún no disponible (abre el ${when})`,
      startDisabledExpired: (when) => `Ya no disponible (cerrado el ${when})`,
      startDisabledGeneric: 'No disponible actualmente',
      assign: 'Enviar este cuestionario a un usuario vinculado al dominio',
      results: 'Ver resultados de los cuestionarios enviados',
      edit: 'Editar esta plantilla',
      delete: 'Eliminar esta plantilla',
    },
  },
  assignDialog: {
    header: 'Enviar cuestionario',
    intro: 'Selecciona una o varias personas vinculadas a este dominio para enviar',
    noRecipients: 'No hay ningun otro usuario vinculado a este dominio.',
    searchPlaceholder: 'Filtrar por nombre',
    selectAll: 'Seleccionar todo',
    clearSelection: 'Deseleccionar todo',
    roleAll: 'Todos los roles',
    submit: 'Enviar',
    cancel: 'Cancelar',
    roleOwner: 'Propietario',
    roleManager: 'Gestor',
    roleMember: 'Miembro vinculado',
  },
  bulk: {
    placeholder: 'Acciones masivas…',
    apply: 'Aplicar',
    activate: 'Activar',
    deactivate: 'Desactivar',
    delete: 'Eliminar',
    selectedCount: (n) => `${n} seleccionado${n > 1 ? 's' : ''}`,
  },
  messages: {
    assignSuccess: (count) => `${count} cuestionario(s) enviado(s).`,
    assignError: 'No se puede enviar este cuestionario.',
    loadError: 'No se pueden cargar los cuestionarios.',
    resultsError: 'No se pueden cargar los resultados.',
    createError: 'No se puede crear este cuestionario.',
    pendingApprovalBanner: (domains: string) => `Pendiente de aprobación para: ${domains}. Los cuestionarios de estos dominios aparecerán una vez aprobado tu acceso.`,
  },
  welcome: {
    title: 'Bienvenido — construyamos tu primer cuestionario',
    hint: 'Tres pasos para empezar. Hazlos seguidos o vuelve más tarde.',
    stepSubjectTitle: '1. Crea un tema',
    stepSubjectHint: 'Agrupa tus preguntas por tema — un tema por capítulo, por competencia, …',
    stepQuestionTitle: '2. Añade una pregunta',
    stepQuestionHint: 'Texto, imagen o vídeo. Múltiples respuestas posibles, explicación opcional.',
    stepQuizTitle: '3. Compón un cuestionario',
    stepQuizHint: 'Elige tus preguntas, ajusta el orden y los pesos, luego activa el cuestionario.',
    ctaSubject: 'Crear un tema',
    ctaQuestion: 'Añadir una pregunta',
    ctaQuiz: 'Componer un cuestionario',
  },
};

const UI_TEXT: Partial<Record<LanguageEnumDto, QuizListUiText>> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
  [LanguageEnumDto.It]: IT,
  [LanguageEnumDto.Es]: ES,
};

export function getQuizListUiText(lang: LanguageEnumDto | string | null | undefined): QuizListUiText {
  return UI_TEXT[lang as LanguageEnumDto] ?? EN;
}
