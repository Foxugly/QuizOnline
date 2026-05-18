import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

/**
 * Page-scoped dictionary for ``/lms/course/new``. Mirrors the shape of
 * ``domain-create.i18n.ts``: a flat ``errors`` bag for ``errText()`` plus
 * stand-alone form labels and helper hints. Five languages (FR/EN/NL/IT/ES)
 * are mandatory — the i18n completeness pre-commit hook fails otherwise.
 */
export interface LmsCourseCreateUiText {
  pageTitle: string;
  subtitle: string;
  settingsCardTitle: string;
  translationsCardTitle: string;
  domainLabel: string;
  domainPlaceholder: string;
  slugLabel: string;
  slugPlaceholder: string;
  slugHint: string;
  levelLabel: string;
  primaryLanguageLabel: string;
  primaryLanguageHint: string;
  enrollmentModeLabel: string;
  titleLabel: string;
  titlePlaceholder: string;
  descriptionLabel: string;
  learningObjectivesLabel: string;
  learningObjectivesHint: string;
  emptyLanguagesMessage: string;
  submitLabel: string;
  toastSuccessSummary: string;
  toastSuccessDetail: string;
  toastErrorSummary: string;
  enrollmentLabels: Record<'open' | 'approval' | 'invite', string>;
  errors: {
    loadFailed: string;
    formInvalid: string;
    saveFailed: string;
    translationFailed: string;
    notInstructorOfAnyDomain: string;
    slugInvalid: string;
    titleRequired: string;
    missingPrimaryLanguage: string;
  };
}

export function getLmsCourseCreateUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCourseCreateUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        pageTitle: 'Créer un cours',
        subtitle: 'Renseignez les informations du cours puis ajoutez les sections et les leçons plus tard.',
        settingsCardTitle: 'Paramètres',
        translationsCardTitle: 'Traductions',
        domainLabel: 'Domaine',
        domainPlaceholder: 'Choisissez un domaine',
        slugLabel: 'Identifiant (slug)',
        slugPlaceholder: 'mon-cours-introductif',
        slugHint: 'Minuscules, chiffres et tirets uniquement.',
        levelLabel: 'Niveau',
        primaryLanguageLabel: 'Langue principale',
        primaryLanguageHint: 'Langue de référence utilisée lors de la traduction automatique.',
        enrollmentModeLabel: 'Mode d’inscription',
        titleLabel: 'Titre',
        titlePlaceholder: 'Titre du cours',
        descriptionLabel: 'Description',
        learningObjectivesLabel: 'Objectifs pédagogiques',
        learningObjectivesHint: 'Liste de compétences ou résultats attendus à la fin du cours.',
        emptyLanguagesMessage: 'Le domaine sélectionné n’a aucune langue active.',
        submitLabel: 'Créer le cours',
        toastSuccessSummary: 'Cours créé',
        toastSuccessDetail: 'Vous pouvez maintenant ajouter des sections et des leçons.',
        toastErrorSummary: 'Erreur',
        enrollmentLabels: {open: 'Libre', approval: 'Sur validation', invite: 'Sur invitation'},
        errors: {
          loadFailed: 'Erreur lors du chargement initial.',
          formInvalid: 'Le formulaire contient des erreurs.',
          saveFailed: 'Erreur backend lors de la création du cours.',
          translationFailed: 'Erreur lors de la traduction.',
          notInstructorOfAnyDomain: 'Vous n’êtes propriétaire ou gestionnaire d’aucun domaine.',
          slugInvalid: 'Le slug doit contenir uniquement des minuscules, chiffres et tirets.',
          titleRequired: 'Un titre est requis dans la langue principale.',
          missingPrimaryLanguage: 'Sélectionnez une langue principale parmi les langues autorisées.',
        },
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Cursus aanmaken',
        subtitle: 'Vul de cursusgegevens in en voeg later secties en lessen toe.',
        settingsCardTitle: 'Instellingen',
        translationsCardTitle: 'Vertalingen',
        domainLabel: 'Domein',
        domainPlaceholder: 'Kies een domein',
        slugLabel: 'Identificator (slug)',
        slugPlaceholder: 'mijn-introcursus',
        slugHint: 'Alleen kleine letters, cijfers en streepjes.',
        levelLabel: 'Niveau',
        primaryLanguageLabel: 'Hoofdtaal',
        primaryLanguageHint: 'Referentietaal voor automatische vertalingen.',
        enrollmentModeLabel: 'Inschrijvingsmodus',
        titleLabel: 'Titel',
        titlePlaceholder: 'Cursustitel',
        descriptionLabel: 'Beschrijving',
        learningObjectivesLabel: 'Leerdoelen',
        learningObjectivesHint: 'Vaardigheden of resultaten die studenten aan het einde behalen.',
        emptyLanguagesMessage: 'Het geselecteerde domein heeft geen actieve talen.',
        submitLabel: 'Cursus aanmaken',
        toastSuccessSummary: 'Cursus aangemaakt',
        toastSuccessDetail: 'U kunt nu secties en lessen toevoegen.',
        toastErrorSummary: 'Fout',
        enrollmentLabels: {open: 'Open', approval: 'Goedkeuring', invite: 'Op uitnodiging'},
        errors: {
          loadFailed: 'Fout bij het laden van de gegevens.',
          formInvalid: 'Het formulier bevat fouten.',
          saveFailed: 'Backend-fout bij het aanmaken van de cursus.',
          translationFailed: 'Fout bij het vertalen.',
          notInstructorOfAnyDomain: 'U bent geen eigenaar of beheerder van een domein.',
          slugInvalid: 'De slug mag alleen kleine letters, cijfers en streepjes bevatten.',
          titleRequired: 'Een titel is vereist in de hoofdtaal.',
          missingPrimaryLanguage: 'Kies een hoofdtaal uit de toegestane talen.',
        },
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'Crea un corso',
        subtitle: 'Compila le informazioni del corso e aggiungi sezioni e lezioni in seguito.',
        settingsCardTitle: 'Impostazioni',
        translationsCardTitle: 'Traduzioni',
        domainLabel: 'Dominio',
        domainPlaceholder: 'Scegli un dominio',
        slugLabel: 'Identificatore (slug)',
        slugPlaceholder: 'mio-corso-introduttivo',
        slugHint: 'Solo lettere minuscole, cifre e trattini.',
        levelLabel: 'Livello',
        primaryLanguageLabel: 'Lingua principale',
        primaryLanguageHint: 'Lingua di riferimento per la traduzione automatica.',
        enrollmentModeLabel: 'Modalità di iscrizione',
        titleLabel: 'Titolo',
        titlePlaceholder: 'Titolo del corso',
        descriptionLabel: 'Descrizione',
        learningObjectivesLabel: 'Obiettivi formativi',
        learningObjectivesHint: 'Competenze o risultati attesi al termine del corso.',
        emptyLanguagesMessage: 'Il dominio selezionato non ha lingue attive.',
        submitLabel: 'Crea corso',
        toastSuccessSummary: 'Corso creato',
        toastSuccessDetail: 'Ora puoi aggiungere sezioni e lezioni.',
        toastErrorSummary: 'Errore',
        enrollmentLabels: {open: 'Aperto', approval: 'Approvazione', invite: 'Solo invito'},
        errors: {
          loadFailed: 'Errore durante il caricamento iniziale.',
          formInvalid: 'Il modulo contiene errori.',
          saveFailed: 'Errore del backend durante la creazione del corso.',
          translationFailed: 'Errore durante la traduzione.',
          notInstructorOfAnyDomain: 'Non sei proprietario o gestore di alcun dominio.',
          slugInvalid: 'Lo slug può contenere solo lettere minuscole, cifre e trattini.',
          titleRequired: 'Un titolo è obbligatorio nella lingua principale.',
          missingPrimaryLanguage: 'Scegli una lingua principale tra le lingue consentite.',
        },
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Crear un curso',
        subtitle: 'Complete la información del curso y agregue secciones y lecciones más tarde.',
        settingsCardTitle: 'Ajustes',
        translationsCardTitle: 'Traducciones',
        domainLabel: 'Dominio',
        domainPlaceholder: 'Elija un dominio',
        slugLabel: 'Identificador (slug)',
        slugPlaceholder: 'mi-curso-introductorio',
        slugHint: 'Solo letras minúsculas, cifras y guiones.',
        levelLabel: 'Nivel',
        primaryLanguageLabel: 'Idioma principal',
        primaryLanguageHint: 'Idioma de referencia para la traducción automática.',
        enrollmentModeLabel: 'Modo de inscripción',
        titleLabel: 'Título',
        titlePlaceholder: 'Título del curso',
        descriptionLabel: 'Descripción',
        learningObjectivesLabel: 'Objetivos de aprendizaje',
        learningObjectivesHint: 'Competencias o resultados que se esperan al finalizar el curso.',
        emptyLanguagesMessage: 'El dominio seleccionado no tiene idiomas activos.',
        submitLabel: 'Crear curso',
        toastSuccessSummary: 'Curso creado',
        toastSuccessDetail: 'Ahora puede añadir secciones y lecciones.',
        toastErrorSummary: 'Error',
        enrollmentLabels: {open: 'Libre', approval: 'Aprobación', invite: 'Por invitación'},
        errors: {
          loadFailed: 'Error durante la carga inicial.',
          formInvalid: 'El formulario contiene errores.',
          saveFailed: 'Error del backend al crear el curso.',
          translationFailed: 'Error durante la traducción.',
          notInstructorOfAnyDomain: 'No es propietario ni gestor de ningún dominio.',
          slugInvalid: 'El slug solo puede contener letras minúsculas, cifras y guiones.',
          titleRequired: 'Se requiere un título en el idioma principal.',
          missingPrimaryLanguage: 'Seleccione un idioma principal entre los idiomas permitidos.',
        },
      };
    default:
      return {
        pageTitle: 'Create a course',
        subtitle: 'Fill in the course information; sections and lessons can be added later.',
        settingsCardTitle: 'Settings',
        translationsCardTitle: 'Translations',
        domainLabel: 'Domain',
        domainPlaceholder: 'Choose a domain',
        slugLabel: 'Identifier (slug)',
        slugPlaceholder: 'my-intro-course',
        slugHint: 'Lowercase letters, digits and dashes only.',
        levelLabel: 'Level',
        primaryLanguageLabel: 'Primary language',
        primaryLanguageHint: 'Reference language used by the auto-translation helper.',
        enrollmentModeLabel: 'Enrollment mode',
        titleLabel: 'Title',
        titlePlaceholder: 'Course title',
        descriptionLabel: 'Description',
        learningObjectivesLabel: 'Learning objectives',
        learningObjectivesHint: 'Skills or outcomes learners will achieve by the end of the course.',
        emptyLanguagesMessage: 'The selected domain has no active language.',
        submitLabel: 'Create course',
        toastSuccessSummary: 'Course created',
        toastSuccessDetail: 'You can now add sections and lessons.',
        toastErrorSummary: 'Error',
        enrollmentLabels: {open: 'Open', approval: 'Approval', invite: 'Invite-only'},
        errors: {
          loadFailed: 'Error while loading initial data.',
          formInvalid: 'The form contains errors.',
          saveFailed: 'Backend error while creating the course.',
          translationFailed: 'Error while translating.',
          notInstructorOfAnyDomain: 'You are not the owner or manager of any domain.',
          slugInvalid: 'The slug may only contain lowercase letters, digits and dashes.',
          titleRequired: 'A title is required in the primary language.',
          missingPrimaryLanguage: 'Pick a primary language from the allowed languages.',
        },
      };
  }
}
