import {LanguageEnumDto} from '../../../../../api/generated/model/language-enum';

/**
 * Page-scoped dictionary for the course-edit "Information" tab.
 *
 * The tab exposes the same editable surface as
 * :func:`getLmsCourseCreateUiText` but for an *existing* course:
 *
 *   * primitive metadata (level / enrollment mode / estimated duration
 *     / cover image),
 *   * per-language translation tabs (title / description / learning
 *     objectives),
 *   * a "translate from active tab" companion button, and
 *   * cancel / save footer actions.
 *
 * Five languages (FR/EN/NL/IT/ES) are mandatory — the i18n
 * completeness pre-commit hook fails otherwise.
 */
export interface LmsCourseEditInfoTabUiText {
  heading: string;
  fields: {
    level: string;
    enrollmentMode: string;
    estimatedDuration: string;
    estimatedDurationHint: string;
    coverImage: string;
    title: string;
    titlePlaceholder: string;
    description: string;
    learningObjectives: string;
    learningObjectivesHint: string;
  };
  enrollmentLabels: Record<'open' | 'approval' | 'invite', string>;
  translateButton: string;
  uploadButton: string;
  removeCoverButton: string;
  clearSelectionButton: string;
  currentCoverLabel: string;
  selectedFileLabel: string;
  noFileSelected: string;
  saveButton: string;
  cancelButton: string;
  errors: {
    formInvalid: string;
    titleRequired: string;
    saveFailed: string;
    translationFailed: string;
    uploadFailed: string;
  };
  toasts: {
    saveSuccess: string;
    errorSummary: string;
  };
}

export function getLmsCourseEditInfoTabUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCourseEditInfoTabUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        heading: 'Informations du cours',
        fields: {
          level: 'Niveau',
          enrollmentMode: 'Mode d’inscription',
          estimatedDuration: 'Durée estimée (minutes)',
          estimatedDurationHint: 'Temps total approximatif pour parcourir le cours.',
          coverImage: 'Image de couverture',
          title: 'Titre',
          titlePlaceholder: 'Titre du cours',
          description: 'Description',
          learningObjectives: 'Objectifs d’apprentissage',
          learningObjectivesHint: 'Liste de compétences ou résultats attendus à la fin du cours.',
        },
        enrollmentLabels: {open: 'Libre', approval: 'Sur validation', invite: 'Sur invitation'},
        translateButton: 'Traduire depuis cet onglet',
        uploadButton: 'Choisir une image…',
        removeCoverButton: 'Retirer l’image',
        clearSelectionButton: 'Annuler la sélection',
        currentCoverLabel: 'Image actuelle',
        selectedFileLabel: 'Fichier sélectionné',
        noFileSelected: 'Aucun fichier sélectionné',
        saveButton: 'Enregistrer',
        cancelButton: 'Annuler',
        errors: {
          formInvalid: 'Veuillez corriger les erreurs avant d’enregistrer.',
          titleRequired: 'Un titre est requis dans la langue principale.',
          saveFailed: 'L’enregistrement a échoué.',
          translationFailed: 'La traduction automatique a échoué.',
          uploadFailed: 'Le téléversement de l’image a échoué.',
        },
        toasts: {
          saveSuccess: 'Cours mis à jour.',
          errorSummary: 'Erreur',
        },
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        heading: 'Cursusgegevens',
        fields: {
          level: 'Niveau',
          enrollmentMode: 'Inschrijvingsmodus',
          estimatedDuration: 'Geschatte duur (minuten)',
          estimatedDurationHint: 'Geschatte totale tijd om de cursus te doorlopen.',
          coverImage: 'Omslagafbeelding',
          title: 'Titel',
          titlePlaceholder: 'Cursustitel',
          description: 'Beschrijving',
          learningObjectives: 'Leerdoelen',
          learningObjectivesHint: 'Vaardigheden of resultaten die studenten aan het einde behalen.',
        },
        enrollmentLabels: {open: 'Open', approval: 'Goedkeuring', invite: 'Op uitnodiging'},
        translateButton: 'Vertalen vanuit dit tabblad',
        uploadButton: 'Afbeelding kiezen…',
        removeCoverButton: 'Afbeelding verwijderen',
        clearSelectionButton: 'Selectie wissen',
        currentCoverLabel: 'Huidige afbeelding',
        selectedFileLabel: 'Geselecteerd bestand',
        noFileSelected: 'Geen bestand geselecteerd',
        saveButton: 'Opslaan',
        cancelButton: 'Annuleren',
        errors: {
          formInvalid: 'Corrigeer de fouten voordat u opslaat.',
          titleRequired: 'Een titel is vereist in de hoofdtaal.',
          saveFailed: 'Opslaan is mislukt.',
          translationFailed: 'Automatische vertaling is mislukt.',
          uploadFailed: 'Upload van de afbeelding is mislukt.',
        },
        toasts: {
          saveSuccess: 'Cursus bijgewerkt.',
          errorSummary: 'Fout',
        },
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        heading: 'Dettagli del corso',
        fields: {
          level: 'Livello',
          enrollmentMode: 'Modalità di iscrizione',
          estimatedDuration: 'Durata stimata (minuti)',
          estimatedDurationHint: 'Tempo totale approssimativo per completare il corso.',
          coverImage: 'Immagine di copertina',
          title: 'Titolo',
          titlePlaceholder: 'Titolo del corso',
          description: 'Descrizione',
          learningObjectives: 'Obiettivi di apprendimento',
          learningObjectivesHint: 'Competenze o risultati attesi al termine del corso.',
        },
        enrollmentLabels: {open: 'Aperto', approval: 'Approvazione', invite: 'Solo invito'},
        translateButton: 'Traduci da questa scheda',
        uploadButton: 'Scegli un’immagine…',
        removeCoverButton: 'Rimuovi immagine',
        clearSelectionButton: 'Annulla selezione',
        currentCoverLabel: 'Immagine attuale',
        selectedFileLabel: 'File selezionato',
        noFileSelected: 'Nessun file selezionato',
        saveButton: 'Salva',
        cancelButton: 'Annulla',
        errors: {
          formInvalid: 'Correggi gli errori prima di salvare.',
          titleRequired: 'Un titolo è obbligatorio nella lingua principale.',
          saveFailed: 'Salvataggio non riuscito.',
          translationFailed: 'Traduzione automatica non riuscita.',
          uploadFailed: 'Caricamento dell’immagine non riuscito.',
        },
        toasts: {
          saveSuccess: 'Corso aggiornato.',
          errorSummary: 'Errore',
        },
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        heading: 'Detalles del curso',
        fields: {
          level: 'Nivel',
          enrollmentMode: 'Modo de inscripción',
          estimatedDuration: 'Duración estimada (minutos)',
          estimatedDurationHint: 'Tiempo total aproximado para completar el curso.',
          coverImage: 'Imagen de portada',
          title: 'Título',
          titlePlaceholder: 'Título del curso',
          description: 'Descripción',
          learningObjectives: 'Objetivos de aprendizaje',
          learningObjectivesHint: 'Competencias o resultados que se esperan al finalizar el curso.',
        },
        enrollmentLabels: {open: 'Libre', approval: 'Aprobación', invite: 'Por invitación'},
        translateButton: 'Traducir desde esta pestaña',
        uploadButton: 'Elegir una imagen…',
        removeCoverButton: 'Quitar imagen',
        clearSelectionButton: 'Cancelar selección',
        currentCoverLabel: 'Imagen actual',
        selectedFileLabel: 'Archivo seleccionado',
        noFileSelected: 'Ningún archivo seleccionado',
        saveButton: 'Guardar',
        cancelButton: 'Cancelar',
        errors: {
          formInvalid: 'Corrija los errores antes de guardar.',
          titleRequired: 'Se requiere un título en el idioma principal.',
          saveFailed: 'No se pudo guardar.',
          translationFailed: 'La traducción automática ha fallado.',
          uploadFailed: 'No se pudo cargar la imagen.',
        },
        toasts: {
          saveSuccess: 'Curso actualizado.',
          errorSummary: 'Error',
        },
      };
    default:
      return {
        heading: 'Course details',
        fields: {
          level: 'Level',
          enrollmentMode: 'Enrollment mode',
          estimatedDuration: 'Estimated duration (minutes)',
          estimatedDurationHint: 'Approximate total time to complete the course.',
          coverImage: 'Cover image',
          title: 'Title',
          titlePlaceholder: 'Course title',
          description: 'Description',
          learningObjectives: 'Learning objectives',
          learningObjectivesHint: 'Skills or outcomes learners will achieve by the end of the course.',
        },
        enrollmentLabels: {open: 'Open', approval: 'Approval', invite: 'Invite-only'},
        translateButton: 'Translate from this tab',
        uploadButton: 'Choose an image…',
        removeCoverButton: 'Remove cover',
        clearSelectionButton: 'Clear selection',
        currentCoverLabel: 'Current cover',
        selectedFileLabel: 'Selected file',
        noFileSelected: 'No file selected',
        saveButton: 'Save',
        cancelButton: 'Cancel',
        errors: {
          formInvalid: 'Please fix the errors before saving.',
          titleRequired: 'A title is required in the primary language.',
          saveFailed: 'Could not save the course.',
          translationFailed: 'Auto-translation failed.',
          uploadFailed: 'Image upload failed.',
        },
        toasts: {
          saveSuccess: 'Course updated.',
          errorSummary: 'Error',
        },
      };
  }
}
