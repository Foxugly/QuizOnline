import {LanguageEnumDto} from '../../../../api/generated/model/language-enum';

/**
 * Per-tab dictionary for the "Structure" tab where sections and lessons
 * are managed: drag-and-drop reorder, add / edit / delete dialogs, and
 * per-row publish + preview toggles. Every visible string surfaced by
 * the tab — including the create / edit dialog labels and toast
 * messages — flows through this getter so the 5 supported languages
 * stay in lock-step.
 */
export interface CourseEditStructureTabUiText {
  heading: string;
  subtitle: string;

  addSectionButton: string;
  addLessonButton: string;
  editButton: string;
  deleteButton: string;
  editContentButton: string;

  isPublishedLabel: string;
  isPreviewLabel: string;

  confirmDeleteSection: (title: string) => string;
  confirmDeleteLesson: (title: string) => string;
  confirmDeleteHeader: string;
  confirmAccept: string;
  confirmReject: string;

  sectionDialog: {
    titleCreate: string;
    titleEdit: string;
    titleField: string;
    descriptionField: string;
    isPublishedField: string;
    submitButton: string;
    cancelButton: string;
    translateButton: string;
    translationFailed: string;
  };

  lessonDialog: {
    titleCreate: string;
    titleEdit: string;
    titleField: string;
    isPreviewField: string;
    isPublishedField: string;
    submitButton: string;
    cancelButton: string;
    translateButton: string;
    translationFailed: string;
  };

  sectionCreatedToast: string;
  sectionUpdatedToast: string;
  sectionDeletedToast: string;
  lessonCreatedToast: string;
  lessonUpdatedToast: string;
  lessonDeletedToast: string;
  reorderSuccessToast: string;
  actionFailedToast: string;
  titleRequiredToast: string;

  untitledSection: string;
  untitledLesson: string;

  emptyTitle: string;
  emptyMessage: string;

  dragHandleAria: string;
  sectionAria: string;
  lessonAria: string;
}

export function getCourseEditStructureTabUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CourseEditStructureTabUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        heading: 'Structure du cours',
        subtitle: 'Organisez le cours en sections et leçons. Glissez-déposez pour réordonner.',
        addSectionButton: 'Ajouter une section',
        addLessonButton: 'Ajouter une leçon',
        editButton: 'Modifier',
        deleteButton: 'Supprimer',
        editContentButton: 'Éditer le contenu',
        isPublishedLabel: 'Publié',
        isPreviewLabel: 'Aperçu',
        confirmDeleteSection: (title) =>
          `Supprimer la section « ${title} » ? Toutes les leçons et leurs blocs de contenu seront définitivement supprimés.`,
        confirmDeleteLesson: (title) =>
          `Supprimer la leçon « ${title} » ? Tous les blocs de contenu seront définitivement supprimés.`,
        confirmDeleteHeader: 'Confirmer la suppression',
        confirmAccept: 'Supprimer',
        confirmReject: 'Annuler',
        sectionDialog: {
          titleCreate: 'Nouvelle section',
          titleEdit: 'Modifier la section',
          titleField: 'Titre',
          descriptionField: 'Description',
          isPublishedField: 'Publiée',
          submitButton: 'Enregistrer',
          cancelButton: 'Annuler',
          translateButton: 'Traduire vers les autres langues',
          translationFailed: 'La traduction automatique a échoué.',
        },
        lessonDialog: {
          titleCreate: 'Nouvelle leçon',
          titleEdit: 'Modifier la leçon',
          titleField: 'Titre',
          isPreviewField: 'Aperçu gratuit',
          isPublishedField: 'Publiée',
          submitButton: 'Enregistrer',
          cancelButton: 'Annuler',
          translateButton: 'Traduire vers les autres langues',
          translationFailed: 'La traduction automatique a échoué.',
        },
        sectionCreatedToast: 'Section ajoutée.',
        sectionUpdatedToast: 'Section mise à jour.',
        sectionDeletedToast: 'Section supprimée.',
        lessonCreatedToast: 'Leçon ajoutée.',
        lessonUpdatedToast: 'Leçon mise à jour.',
        lessonDeletedToast: 'Leçon supprimée.',
        reorderSuccessToast: 'Ordre mis à jour.',
        actionFailedToast: "L'action a échoué.",
        titleRequiredToast: 'Le titre est obligatoire dans la langue principale.',
        untitledSection: 'Section sans titre',
        untitledLesson: 'Leçon sans titre',
        emptyTitle: 'Aucune section pour le moment',
        emptyMessage: 'Commencez par ajouter une section pour structurer votre cours.',
        dragHandleAria: 'Glisser pour réordonner',
        sectionAria: 'Section',
        lessonAria: 'Leçon',
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        heading: 'Cursusstructuur',
        subtitle: 'Organiseer de cursus in secties en lessen. Sleep om opnieuw te ordenen.',
        addSectionButton: 'Sectie toevoegen',
        addLessonButton: 'Les toevoegen',
        editButton: 'Bewerken',
        deleteButton: 'Verwijderen',
        editContentButton: 'Inhoud bewerken',
        isPublishedLabel: 'Gepubliceerd',
        isPreviewLabel: 'Voorbeeld',
        confirmDeleteSection: (title) =>
          `Sectie "${title}" verwijderen? Alle lessen en hun inhoudsblokken worden definitief verwijderd.`,
        confirmDeleteLesson: (title) =>
          `Les "${title}" verwijderen? Alle inhoudsblokken worden definitief verwijderd.`,
        confirmDeleteHeader: 'Verwijderen bevestigen',
        confirmAccept: 'Verwijderen',
        confirmReject: 'Annuleren',
        sectionDialog: {
          titleCreate: 'Nieuwe sectie',
          titleEdit: 'Sectie bewerken',
          titleField: 'Titel',
          descriptionField: 'Beschrijving',
          isPublishedField: 'Gepubliceerd',
          submitButton: 'Opslaan',
          cancelButton: 'Annuleren',
          translateButton: 'Vertaal naar andere talen',
          translationFailed: 'Automatische vertaling mislukt.',
        },
        lessonDialog: {
          titleCreate: 'Nieuwe les',
          titleEdit: 'Les bewerken',
          titleField: 'Titel',
          isPreviewField: 'Gratis voorbeeld',
          isPublishedField: 'Gepubliceerd',
          submitButton: 'Opslaan',
          cancelButton: 'Annuleren',
          translateButton: 'Vertaal naar andere talen',
          translationFailed: 'Automatische vertaling mislukt.',
        },
        sectionCreatedToast: 'Sectie toegevoegd.',
        sectionUpdatedToast: 'Sectie bijgewerkt.',
        sectionDeletedToast: 'Sectie verwijderd.',
        lessonCreatedToast: 'Les toegevoegd.',
        lessonUpdatedToast: 'Les bijgewerkt.',
        lessonDeletedToast: 'Les verwijderd.',
        reorderSuccessToast: 'Volgorde bijgewerkt.',
        actionFailedToast: 'Actie mislukt.',
        titleRequiredToast: 'Titel is verplicht in de hoofdtaal.',
        untitledSection: 'Sectie zonder titel',
        untitledLesson: 'Les zonder titel',
        emptyTitle: 'Nog geen secties',
        emptyMessage: 'Voeg een eerste sectie toe om je cursus te structureren.',
        dragHandleAria: 'Sleep om opnieuw te ordenen',
        sectionAria: 'Sectie',
        lessonAria: 'Les',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        heading: 'Struttura del corso',
        subtitle: 'Organizza il corso in sezioni e lezioni. Trascina per riordinare.',
        addSectionButton: 'Aggiungi sezione',
        addLessonButton: 'Aggiungi lezione',
        editButton: 'Modifica',
        deleteButton: 'Elimina',
        editContentButton: 'Modifica contenuto',
        isPublishedLabel: 'Pubblicata',
        isPreviewLabel: 'Anteprima',
        confirmDeleteSection: (title) =>
          `Eliminare la sezione "${title}"? Tutte le lezioni e i loro blocchi di contenuto saranno eliminati definitivamente.`,
        confirmDeleteLesson: (title) =>
          `Eliminare la lezione "${title}"? Tutti i blocchi di contenuto saranno eliminati definitivamente.`,
        confirmDeleteHeader: 'Conferma eliminazione',
        confirmAccept: 'Elimina',
        confirmReject: 'Annulla',
        sectionDialog: {
          titleCreate: 'Nuova sezione',
          titleEdit: 'Modifica sezione',
          titleField: 'Titolo',
          descriptionField: 'Descrizione',
          isPublishedField: 'Pubblicata',
          submitButton: 'Salva',
          cancelButton: 'Annulla',
          translateButton: 'Traduci nelle altre lingue',
          translationFailed: 'Traduzione automatica non riuscita.',
        },
        lessonDialog: {
          titleCreate: 'Nuova lezione',
          titleEdit: 'Modifica lezione',
          titleField: 'Titolo',
          isPreviewField: 'Anteprima gratuita',
          isPublishedField: 'Pubblicata',
          submitButton: 'Salva',
          cancelButton: 'Annulla',
          translateButton: 'Traduci nelle altre lingue',
          translationFailed: 'Traduzione automatica non riuscita.',
        },
        sectionCreatedToast: 'Sezione aggiunta.',
        sectionUpdatedToast: 'Sezione aggiornata.',
        sectionDeletedToast: 'Sezione eliminata.',
        lessonCreatedToast: 'Lezione aggiunta.',
        lessonUpdatedToast: 'Lezione aggiornata.',
        lessonDeletedToast: 'Lezione eliminata.',
        reorderSuccessToast: 'Ordine aggiornato.',
        actionFailedToast: 'Azione non riuscita.',
        titleRequiredToast: 'Il titolo è obbligatorio nella lingua principale.',
        untitledSection: 'Sezione senza titolo',
        untitledLesson: 'Lezione senza titolo',
        emptyTitle: 'Ancora nessuna sezione',
        emptyMessage: 'Inizia aggiungendo una sezione per strutturare il tuo corso.',
        dragHandleAria: 'Trascina per riordinare',
        sectionAria: 'Sezione',
        lessonAria: 'Lezione',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        heading: 'Estructura del curso',
        subtitle: 'Organiza el curso en secciones y lecciones. Arrastra para reordenar.',
        addSectionButton: 'Añadir sección',
        addLessonButton: 'Añadir lección',
        editButton: 'Editar',
        deleteButton: 'Eliminar',
        editContentButton: 'Editar contenido',
        isPublishedLabel: 'Publicada',
        isPreviewLabel: 'Vista previa',
        confirmDeleteSection: (title) =>
          `¿Eliminar la sección «${title}»? Todas las lecciones y sus bloques de contenido se eliminarán de forma permanente.`,
        confirmDeleteLesson: (title) =>
          `¿Eliminar la lección «${title}»? Todos los bloques de contenido se eliminarán de forma permanente.`,
        confirmDeleteHeader: 'Confirmar eliminación',
        confirmAccept: 'Eliminar',
        confirmReject: 'Cancelar',
        sectionDialog: {
          titleCreate: 'Nueva sección',
          titleEdit: 'Editar sección',
          titleField: 'Título',
          descriptionField: 'Descripción',
          isPublishedField: 'Publicada',
          submitButton: 'Guardar',
          cancelButton: 'Cancelar',
          translateButton: 'Traducir a otros idiomas',
          translationFailed: 'La traducción automática ha fallado.',
        },
        lessonDialog: {
          titleCreate: 'Nueva lección',
          titleEdit: 'Editar lección',
          titleField: 'Título',
          isPreviewField: 'Vista previa gratuita',
          isPublishedField: 'Publicada',
          submitButton: 'Guardar',
          cancelButton: 'Cancelar',
          translateButton: 'Traducir a otros idiomas',
          translationFailed: 'La traducción automática ha fallado.',
        },
        sectionCreatedToast: 'Sección añadida.',
        sectionUpdatedToast: 'Sección actualizada.',
        sectionDeletedToast: 'Sección eliminada.',
        lessonCreatedToast: 'Lección añadida.',
        lessonUpdatedToast: 'Lección actualizada.',
        lessonDeletedToast: 'Lección eliminada.',
        reorderSuccessToast: 'Orden actualizado.',
        actionFailedToast: 'La acción ha fallado.',
        titleRequiredToast: 'El título es obligatorio en el idioma principal.',
        untitledSection: 'Sección sin título',
        untitledLesson: 'Lección sin título',
        emptyTitle: 'Aún no hay secciones',
        emptyMessage: 'Comienza añadiendo una sección para estructurar tu curso.',
        dragHandleAria: 'Arrastrar para reordenar',
        sectionAria: 'Sección',
        lessonAria: 'Lección',
      };
    default:
      return {
        heading: 'Course structure',
        subtitle: 'Organize the course into sections and lessons. Drag to reorder.',
        addSectionButton: 'Add section',
        addLessonButton: 'Add lesson',
        editButton: 'Edit',
        deleteButton: 'Delete',
        editContentButton: 'Edit content',
        isPublishedLabel: 'Published',
        isPreviewLabel: 'Preview',
        confirmDeleteSection: (title) =>
          `Delete section "${title}"? All lessons and their content blocks will be permanently deleted.`,
        confirmDeleteLesson: (title) =>
          `Delete lesson "${title}"? All content blocks will be permanently deleted.`,
        confirmDeleteHeader: 'Confirm deletion',
        confirmAccept: 'Delete',
        confirmReject: 'Cancel',
        sectionDialog: {
          titleCreate: 'New section',
          titleEdit: 'Edit section',
          titleField: 'Title',
          descriptionField: 'Description',
          isPublishedField: 'Published',
          submitButton: 'Save',
          cancelButton: 'Cancel',
          translateButton: 'Translate to other languages',
          translationFailed: 'Auto-translation failed.',
        },
        lessonDialog: {
          titleCreate: 'New lesson',
          titleEdit: 'Edit lesson',
          titleField: 'Title',
          isPreviewField: 'Free preview',
          isPublishedField: 'Published',
          submitButton: 'Save',
          cancelButton: 'Cancel',
          translateButton: 'Translate to other languages',
          translationFailed: 'Auto-translation failed.',
        },
        sectionCreatedToast: 'Section added.',
        sectionUpdatedToast: 'Section updated.',
        sectionDeletedToast: 'Section deleted.',
        lessonCreatedToast: 'Lesson added.',
        lessonUpdatedToast: 'Lesson updated.',
        lessonDeletedToast: 'Lesson deleted.',
        reorderSuccessToast: 'Order updated.',
        actionFailedToast: 'Action failed.',
        titleRequiredToast: 'Title is required in the primary language.',
        untitledSection: 'Untitled section',
        untitledLesson: 'Untitled lesson',
        emptyTitle: 'No sections yet',
        emptyMessage: 'Start by adding a section to structure your course.',
        dragHandleAria: 'Drag to reorder',
        sectionAria: 'Section',
        lessonAria: 'Lesson',
      };
  }
}
