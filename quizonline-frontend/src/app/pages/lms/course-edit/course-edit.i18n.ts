import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

/**
 * Shell-level labels for the course-edit page. Includes the page title,
 * the four top-level tab labels and the publish/unpublish controls in
 * the page header. Each tab owns its own dictionary so this getter
 * stays narrow and the full course-author experience can grow
 * tab-by-tab without churning the shell.
 */
export interface LmsCourseEditUiText {
  pageTitle: string;
  tabInfo: string;
  tabStructure: string;
  tabEnrollment: string;
  tabAnalytics: string;
  publishButton: string;
  unpublishButton: string;
  publishedBadge: string;
  unpublishedBadge: string;
  publishSuccessToast: string;
  publishErrorToast: string;
  unpublishSuccessToast: string;
  unpublishErrorToast: string;
  loadErrorToast: string;
  loadingMessage: string;
  cloneButton: string;
  exportButton: string;
  exportSuccessToast: string;
  exportErrorToast: string;
  deleteButton: string;
  confirmCloneTitle: string;
  confirmCloneMessage: string;
  confirmCloneAccept: string;
  confirmCloneReject: string;
  confirmDeleteTitle: string;
  confirmDeleteMessage: string;
  confirmDeleteAccept: string;
  confirmDeleteReject: string;
  cloneSuccessToast: string;
  cloneErrorToast: string;
  deleteSuccessToast: string;
  deleteErrorToast: string;
  deleteProtectedToast: string;
}

export function getLmsCourseEditUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsCourseEditUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        pageTitle: 'Édition du cours',
        tabInfo: 'Informations',
        tabStructure: 'Structure',
        tabEnrollment: 'Inscriptions',
        tabAnalytics: 'Analyses',
        publishButton: 'Publier',
        unpublishButton: 'Dépublier',
        publishedBadge: 'Publié',
        unpublishedBadge: 'Brouillon',
        publishSuccessToast: 'Cours publié.',
        publishErrorToast: 'La publication a échoué.',
        unpublishSuccessToast: 'Cours dépublié.',
        unpublishErrorToast: 'La dépublication a échoué.',
        loadErrorToast: 'Impossible de charger le cours.',
        loadingMessage: 'Chargement…',
        cloneButton: 'Dupliquer',
        exportButton: 'Exporter (JSON)',
        exportSuccessToast: 'Cours exporté.',
        exportErrorToast: 'Échec de l\'export.',
        deleteButton: 'Supprimer',
        confirmCloneTitle: 'Dupliquer ce cours ?',
        confirmCloneMessage:
          'Créer une copie complète de ce cours (sections, leçons et blocs de contenu) ? La copie sera créée en mode brouillon.',
        confirmCloneAccept: 'Dupliquer',
        confirmCloneReject: 'Annuler',
        confirmDeleteTitle: 'Supprimer ce cours ?',
        confirmDeleteMessage:
          'Cette action supprime définitivement le cours, toutes ses sections, leçons, blocs de contenu, ainsi que toutes les inscriptions et la progression des apprenants. Cette opération est irréversible.',
        confirmDeleteAccept: 'Supprimer',
        confirmDeleteReject: 'Annuler',
        cloneSuccessToast: 'Cours dupliqué.',
        cloneErrorToast: 'La duplication du cours a échoué.',
        deleteSuccessToast: 'Cours supprimé.',
        deleteErrorToast: 'La suppression du cours a échoué.',
        deleteProtectedToast:
          'Impossible de supprimer un cours ayant déjà émis des certificats.',
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Cursus bewerken',
        tabInfo: 'Informatie',
        tabStructure: 'Structuur',
        tabEnrollment: 'Inschrijvingen',
        tabAnalytics: 'Analyses',
        publishButton: 'Publiceren',
        unpublishButton: 'Depubliceren',
        publishedBadge: 'Gepubliceerd',
        unpublishedBadge: 'Concept',
        publishSuccessToast: 'Cursus gepubliceerd.',
        publishErrorToast: 'Publiceren is mislukt.',
        unpublishSuccessToast: 'Cursus gedepubliceerd.',
        unpublishErrorToast: 'Depubliceren is mislukt.',
        loadErrorToast: 'Cursus kon niet worden geladen.',
        loadingMessage: 'Laden…',
        cloneButton: 'Dupliceren',
        exportButton: 'Exporteren (JSON)',
        exportSuccessToast: 'Cursus geëxporteerd.',
        exportErrorToast: 'Export mislukt.',
        deleteButton: 'Verwijderen',
        confirmCloneTitle: 'Deze cursus dupliceren?',
        confirmCloneMessage:
          'Een volledige kopie van deze cursus maken (secties, lessen en inhoudsblokken)? De kopie wordt als concept aangemaakt.',
        confirmCloneAccept: 'Dupliceren',
        confirmCloneReject: 'Annuleren',
        confirmDeleteTitle: 'Deze cursus verwijderen?',
        confirmDeleteMessage:
          'Deze actie verwijdert de cursus, alle secties, lessen, inhoudsblokken en alle inschrijvingen en voortgang van cursisten definitief. Dit kan niet ongedaan worden gemaakt.',
        confirmDeleteAccept: 'Verwijderen',
        confirmDeleteReject: 'Annuleren',
        cloneSuccessToast: 'Cursus gedupliceerd.',
        cloneErrorToast: 'Cursus dupliceren is mislukt.',
        deleteSuccessToast: 'Cursus verwijderd.',
        deleteErrorToast: 'Cursus verwijderen is mislukt.',
        deleteProtectedToast:
          'Een cursus die al certificaten heeft uitgegeven kan niet worden verwijderd.',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'Modifica corso',
        tabInfo: 'Informazioni',
        tabStructure: 'Struttura',
        tabEnrollment: 'Iscrizioni',
        tabAnalytics: 'Analisi',
        publishButton: 'Pubblica',
        unpublishButton: 'Spubblica',
        publishedBadge: 'Pubblicato',
        unpublishedBadge: 'Bozza',
        publishSuccessToast: 'Corso pubblicato.',
        publishErrorToast: 'Pubblicazione non riuscita.',
        unpublishSuccessToast: 'Corso spubblicato.',
        unpublishErrorToast: 'Spubblicazione non riuscita.',
        loadErrorToast: 'Impossibile caricare il corso.',
        loadingMessage: 'Caricamento…',
        cloneButton: 'Duplica',
        exportButton: 'Esporta (JSON)',
        exportSuccessToast: 'Corso esportato.',
        exportErrorToast: 'Esportazione non riuscita.',
        deleteButton: 'Elimina',
        confirmCloneTitle: 'Duplicare questo corso?',
        confirmCloneMessage:
          'Creare una copia completa di questo corso (sezioni, lezioni e blocchi di contenuto)? La copia verrà creata in bozza.',
        confirmCloneAccept: 'Duplica',
        confirmCloneReject: 'Annulla',
        confirmDeleteTitle: 'Eliminare questo corso?',
        confirmDeleteMessage:
          'Questa azione elimina definitivamente il corso, tutte le sezioni, le lezioni, i blocchi di contenuto e tutte le iscrizioni e i progressi dei partecipanti. Operazione irreversibile.',
        confirmDeleteAccept: 'Elimina',
        confirmDeleteReject: 'Annulla',
        cloneSuccessToast: 'Corso duplicato.',
        cloneErrorToast: 'Duplicazione del corso non riuscita.',
        deleteSuccessToast: 'Corso eliminato.',
        deleteErrorToast: 'Eliminazione del corso non riuscita.',
        deleteProtectedToast:
          'Impossibile eliminare un corso che ha già emesso certificati.',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Editar curso',
        tabInfo: 'Información',
        tabStructure: 'Estructura',
        tabEnrollment: 'Inscripciones',
        tabAnalytics: 'Analíticas',
        publishButton: 'Publicar',
        unpublishButton: 'Despublicar',
        publishedBadge: 'Publicado',
        unpublishedBadge: 'Borrador',
        publishSuccessToast: 'Curso publicado.',
        publishErrorToast: 'No se pudo publicar el curso.',
        unpublishSuccessToast: 'Curso despublicado.',
        unpublishErrorToast: 'No se pudo despublicar el curso.',
        loadErrorToast: 'No se pudo cargar el curso.',
        loadingMessage: 'Cargando…',
        cloneButton: 'Duplicar',
        exportButton: 'Exportar (JSON)',
        exportSuccessToast: 'Curso exportado.',
        exportErrorToast: 'La exportación falló.',
        deleteButton: 'Eliminar',
        confirmCloneTitle: '¿Duplicar este curso?',
        confirmCloneMessage:
          '¿Crear una copia completa de este curso (secciones, lecciones y bloques de contenido)? La copia se creará como borrador.',
        confirmCloneAccept: 'Duplicar',
        confirmCloneReject: 'Cancelar',
        confirmDeleteTitle: '¿Eliminar este curso?',
        confirmDeleteMessage:
          'Esta acción elimina permanentemente el curso, todas sus secciones, lecciones, bloques de contenido y todas las inscripciones y el progreso de los estudiantes. Operación irreversible.',
        confirmDeleteAccept: 'Eliminar',
        confirmDeleteReject: 'Cancelar',
        cloneSuccessToast: 'Curso duplicado.',
        cloneErrorToast: 'No se pudo duplicar el curso.',
        deleteSuccessToast: 'Curso eliminado.',
        deleteErrorToast: 'No se pudo eliminar el curso.',
        deleteProtectedToast:
          'No se puede eliminar un curso que ya ha emitido certificados.',
      };
    default:
      return {
        pageTitle: 'Edit course',
        tabInfo: 'Information',
        tabStructure: 'Structure',
        tabEnrollment: 'Enrollment',
        tabAnalytics: 'Analytics',
        publishButton: 'Publish',
        unpublishButton: 'Unpublish',
        publishedBadge: 'Published',
        unpublishedBadge: 'Draft',
        publishSuccessToast: 'Course published.',
        publishErrorToast: 'Could not publish course.',
        unpublishSuccessToast: 'Course unpublished.',
        unpublishErrorToast: 'Could not unpublish course.',
        loadErrorToast: 'Could not load course.',
        loadingMessage: 'Loading…',
        cloneButton: 'Duplicate',
        exportButton: 'Export (JSON)',
        exportSuccessToast: 'Course exported.',
        exportErrorToast: 'Export failed.',
        deleteButton: 'Delete',
        confirmCloneTitle: 'Duplicate this course?',
        confirmCloneMessage:
          'Create a full copy of this course (sections, lessons and content blocks)? The copy will be created as a draft.',
        confirmCloneAccept: 'Duplicate',
        confirmCloneReject: 'Cancel',
        confirmDeleteTitle: 'Delete this course?',
        confirmDeleteMessage:
          'This permanently deletes the course, all sections, all lessons, all content blocks AND all learner enrollments and progress. This cannot be undone.',
        confirmDeleteAccept: 'Delete',
        confirmDeleteReject: 'Cancel',
        cloneSuccessToast: 'Course duplicated.',
        cloneErrorToast: 'Could not duplicate course.',
        deleteSuccessToast: 'Course deleted.',
        deleteErrorToast: 'Could not delete course.',
        deleteProtectedToast: 'Cannot delete a course that has issued certificates.',
      };
  }
}
