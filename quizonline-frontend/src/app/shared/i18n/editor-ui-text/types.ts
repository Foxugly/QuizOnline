export type EditorUiText = {
  common: {
    back: string;
    cancel: string;
    clean: string;
    save: string;
    add: string;
    create: string;
    delete: string;
    confirm: string;
    duplicate: string;
    edit: string;
    send: string;
    sending: string;
    refresh: string;
    close: string;
    reopen: string;
    login: string;
    loading: string;
    translateOthers: string;
    translating: string;
    view: string;
    previous: string;
    next: string;
    finish: string;
    quick: string;
    downloadPdf: string;
    /** Generic "Error" used as a toast summary for unhappy paths. */
    errorTitle: string;
  };
  quiz: {
    newTemplate: string;
    markAnswered: string;
    toggleFlag: string;
    alert: string;
    backToQuiz: string;
    finishReview: string;
    startQuiz: string;
    continueQuiz: string;
    viewCorrection: string;
    quizFinished: string;
    backToList: string;
    questionLabel: string;
    scoreAvailableOn: string;
    detailAvailableOn: string;
    statusReady: string;
    statusInProgress: string;
    statusFinished: string;
    modePractice: string;
    modeExam: string;
    correctionLabel: string;
    scoreLabel: string;
    timerLabel: string;
    questionsLabel: string;
    noTimeLimit: string;
    createdOn: string;
    startedOn: string;
    closedOn: string;
    /** Template with {correct} and {total} placeholders, e.g. "{correct} bonnes réponses sur {total}". */
    correctAnswersOf: string;
    invalidQuizId: string;
    loadFailed: string;
    startFailed: string;
    finishQuizButton: string;
    finishQuizConfirmHeader: string;
    finishQuizConfirmMessage: string;
    timeUp: string;
    timeUpAutoClose: string;
    timeRemaining: string;
    autoClosingInProgress: string;
    reviewModeLabel: string;
    reviewModeValue: string;
    quizUnavailable: string;
    saveAnswerFailed: string;
    noQuestions: string;
    closeFailed: string;
    alertSendFailed: string;
    reportDialogHeader: string;
    reportDialogBody: string;
    reportDialogPlaceholder: string;
    noCopyToastSummary: string;
    noCopyToastDetail: string;
  };
  userAdminForm: {
    badgeSuperuser: string;
    usernameLabel: string;
    isActiveLabel: string;
    languageLabel: string;
    nbDomainMaxLabel: string;
    emailLabel: string;
    emailConfirmedLabel: string;
    firstNameLabel: string;
    lastNameLabel: string;
    passwordLabel: string;
    passwordChangeRequiredLabel: string;
  };
  quizPlay: {
    quizTitleLabel: string;
    userLabel: string;
    modeLabel: string;
    durationLabel: string;
    currentQuestion: (index: number) => string;
  };
  mediaSelector: {
    tagImageLocal: string;
    tagVideoLocal: string;
    tagImageExisting: string;
    tagVideoExisting: string;
    tagYoutube: string;
    tagUnknown: string;
    invalidYoutubeUrl: string;
    imagePreviewAlt: string;
  };
  bulkList: {
    activate: string;
    deactivate: string;
    delete: string;
    confirmDeleteHeader: string;
    confirmDeleteAccept: string;
    confirmDeleteCancel: string;
    confirmDeleteUsers: (n: number) => string;
    confirmDeleteSubjects: (n: number) => string;
    confirmDeleteTemplates: (n: number) => string;
  };
  quizSessionTable: {
    colTitle: string;
    colStatus: string;
    colMode: string;
    colQuestions: string;
    colCreatedAt: string;
    colStartedAt: string;
    colEndedAt: string;
    colScore: string;
    colActions: string;
    statusAnswered: string;
    statusInProgress: string;
    statusNotStarted: string;
    actionView: string;
    actionContinue: string;
    actionStart: string;
    empty: string;
  };
  pages: {
    domainCreate: {title: string; subtitle: string;};
    domainEdit: {title: string; subtitle: string;};
    subjectCreate: {
      title: string;
      subtitle: string;
      emptyLanguagesMessage: string;
      errors: {
        loadDomainsFailed: string;
        loadDomainFailed: string;
        nameRequired: string;
        createFailed: string;
        translationFailed: string;
      };
    };
    subjectEdit: {
      title: string;
      subtitle: string;
      questionsTitle: string;
      addQuestion: string;
      noQuestions: string;
      titleCol: string;
      actionsCol: string;
      emptyLanguagesMessage: string;
      errors: {
        saveFailed: string;
        translationFailed: string;
        loadFailed: string;
      };
    };
    questionList?: {title: string; subtitle: string; searchPlaceholder: string; newQuestion: string; titleCol: string; activeCol: string; modesCol: string; domainsCol: string; subjectsCol: string; actionsCol: string; practice: string; exam: string;};
    questionCreate: {
      title: string;
      subtitle: string;
      emptyLanguagesMessage: string;
      practiceTooltipFallback: string;
      errors: {
        loadInitialFailed: string;
        loadDomainFailed: string;
        translationFailed: string;
        toastSummary: string;
        missingFields: string;
        missingCorrectAnswer: string;
        saveFailed: string;
      };
    };
    questionEdit: {
      title: string;
      subtitle: string;
      emptyLanguagesMessage: string;
      errors: {
        invalidId: string;
        translationFailed: string;
        deleteFailed: string;
        needOneCorrect: string;
        formInvalid: string;
        saveSuccess: string;
        saveFailed: string;
        loadFailed: string;
        duplicateFailed: string;
        confirmDelete: string;
      };
    };
    questionView: {
      title: string;
      revealOn: string;
      revealOff: string;
      errors: {
        invalidId: string;
        loadFailed: string;
      };
    };
    quizQuick: {
      title: string;
      subtitle: string;
      submit: string;
      errors: {
        generateFailed: string;
        titleRequired: string;
        domainRequired: string;
        subjectsRequired: string;
        questionCountInvalid: string;
        loadDomainsFailed: string;
        loadSubjectsFailed: string;
      };
    };
    quizCreate: {
      back: string;
      cancel: string;
      loading: string;
      createQuestionForTemplate: string;
      createQuestionForQuiz: string;
      createQuestion: string;
      emptyLanguagesMessage: string;
      practiceTooltipFallback: string;
      errors: {
        invalidTemplateId: string;
        loadTemplateFailed: string;
        domainRequiredFirst: string;
        translateQuestionFailed: string;
        translateTemplateFailed: string;
        needOneCorrect: string;
        createQuestionFailed: string;
        notAuthorized: string;
        completeQuizRequired: string;
        domainChangeReset: string;
        loadQuestionsFailed: string;
        templateNotFound: string;
        updateTemplateFailed: string;
        createTemplateFailed: string;
        createQuizFailed: string;
      };
    };
    quizAlertList: {
      errors: {
        loadFailed: string;
      };
    };
    userEdit: {
      title: string;
      subtitle: string;
      errors: {
        invalidId: string;
        formInvalid: string;
        loadFailed: string;
        updateFailed: string;
      };
    };
    userCreate: {
      title: string;
      errors: {
        formInvalid: string;
        createFailed: string;
      };
    };
    userDelete: {
      errors: {
        invalidId: string;
        loadFailed: string;
        deleteFailed: string;
      };
    };
    quizTemplateDelete: {
      errors: {
        invalidId: string;
        loadFailed: string;
        deleteFailed: string;
      };
    };
    quizSessionDelete: {
      errors: {
        invalidId: string;
        loadFailed: string;
        deleteFailed: string;
      };
    };
    questionDelete: {
      errors: {
        invalidId: string;
        loadFailed: string;
        deleteFailed: string;
      };
    };
    userList: {title: string; subtitle: string; id: string; username: string; name: string; email: string; nbDomainMax: string; active: string; emailConfirmed: string; actions: string;};
    quizTemplateResults: {
      title: string;
      titleWithTemplate: string;
      searchPlaceholder: string;
      exportCsv: string;
      loadFailed: string;
      emptyMessage: string;
      statusAnswered: string;
      statusNotStarted: string;
      colUser: string;
      colStatus: string;
      colAnswers: string;
      colScore: string;
      colActions: string;
      csvLastName: string;
      csvFirstName: string;
      csvEmail: string;
    };
  };
  domainForm: {
    translations: string;
    languagesCount: string;
    allowedLanguages: string;
    selectOneLanguage: string;
    titleLabel: string;
    titleRequired: string;
    description: string;
    titlePlaceholder: string;
    parameters: string;
    statusAccess: string;
    active: string;
    owner: string;
    managers: string;
    available: string;
    selected: string;
    readonly: string;
    joinPolicy: string;
    joinPolicyAuto: string;
    joinPolicyOwner: string;
    joinPolicyOwnerManagers: string;
    joinPolicyHint: string;
    publicLabel: string;
    publicHint: string;
  };
  subjectForm: {
    domain: string;
    availableCount: string;
    chooseDomain: string;
    translations: string;
    languagesCount: string;
    name: string;
    description: string;
    namePlaceholder: string;
    required: string;
    emptyLanguages: string;
  };
  questionForm: {
    context: string;
    domain: string;
    domainUnavailable: string;
    chooseDomain: string;
    subjects: string;
    chooseSubjects: string;
    active: string;
    mode: string;
    practice: string;
    practiceHint: string;
    exam: string;
    examHint: string;
    content: string;
    title: string;
    titlePlaceholder: string;
    description: string;
    titleRequired: string;
    answers: string;
    correctAnswer: string;
    answerContent: string;
    deleteAnswer: string;
    addAnswer: string;
    explanation: string;
    media: string;
    noActiveLanguages: string;
    deleteQuestion: string;
  };
};
