import {LanguageEnumDto} from '../../api/generated/model/language-enum';

/**
 * Full per-page dictionary for the lesson authoring page. Covers the
 * shell title, the drag-and-drop add-bar, the per-block delete
 * affordance, and every success / error toast emitted by the page so
 * no English literal leaks into the localized UI.
 */
export interface LessonEditUiText {
  pageTitle: string;
  addBlockBarLabel: string;
  addBlockHint: string;
  deleteBlockAria: string;
  deleteBlockConfirm: string;
  reorderSuccessToast: string;
  reorderErrorToast: string;
  blockAddedToast: string;
  blockDeletedToast: string;
  blockUpdatedToast: string;
  blockErrorToast: string;
  emptyTitle: string;
  emptyHint: string;
  /** Label for the top-right "view as learner" eye button. */
  viewAsLearnerButton: string;
  /** Toggle label that swaps the editor for the in-page learner preview. */
  previewButton: string;
  /** Toggle label shown when the preview is active (switches back to edit mode). */
  editModeButton: string;
  /** Heading + aria-label of the left-side block outline shown in
   *  preview mode — mirrors the learner-facing /lesson/{id} page. */
  outlineHeading: string;
}

export function getLessonEditUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LessonEditUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        pageTitle: 'Édition de la leçon',
        addBlockBarLabel: 'Ajouter un bloc',
        addBlockHint: 'Ajouter un bloc à la leçon',
        deleteBlockAria: 'Supprimer le bloc',
        deleteBlockConfirm: 'Supprimer ce bloc ?',
        reorderSuccessToast: 'Ordre des blocs enregistré.',
        reorderErrorToast: 'Impossible d\'enregistrer le nouvel ordre.',
        blockAddedToast: 'Bloc ajouté.',
        blockDeletedToast: 'Bloc supprimé.',
        blockUpdatedToast: 'Bloc mis à jour.',
        blockErrorToast: 'L\'opération sur le bloc a échoué.',
        emptyTitle: 'Leçon vide',
        emptyHint: 'Ajoutez un premier bloc à l\'aide de la barre ci-dessous.',
        viewAsLearnerButton: 'Aperçu apprenant',
        previewButton: 'Aperçu',
        editModeButton: 'Édition',
        outlineHeading: 'Plan de la leçon',
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Les bewerken',
        addBlockBarLabel: 'Een blok toevoegen',
        addBlockHint: 'Een blok aan de les toevoegen',
        deleteBlockAria: 'Blok verwijderen',
        deleteBlockConfirm: 'Dit blok verwijderen?',
        reorderSuccessToast: 'Volgorde van de blokken opgeslagen.',
        reorderErrorToast: 'Kan de nieuwe volgorde niet opslaan.',
        blockAddedToast: 'Blok toegevoegd.',
        blockDeletedToast: 'Blok verwijderd.',
        blockUpdatedToast: 'Blok bijgewerkt.',
        blockErrorToast: 'De blok-bewerking is mislukt.',
        emptyTitle: 'Lege les',
        emptyHint: 'Voeg een eerste blok toe via de balk hieronder.',
        viewAsLearnerButton: 'Cursist-weergave',
        previewButton: 'Voorbeeld',
        editModeButton: 'Bewerken',
        outlineHeading: 'Lesoverzicht',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'Modifica lezione',
        addBlockBarLabel: 'Aggiungi un blocco',
        addBlockHint: 'Aggiungi un blocco alla lezione',
        deleteBlockAria: 'Elimina il blocco',
        deleteBlockConfirm: 'Eliminare questo blocco?',
        reorderSuccessToast: 'Ordine dei blocchi salvato.',
        reorderErrorToast: 'Impossibile salvare il nuovo ordine.',
        blockAddedToast: 'Blocco aggiunto.',
        blockDeletedToast: 'Blocco eliminato.',
        blockUpdatedToast: 'Blocco aggiornato.',
        blockErrorToast: 'Operazione sul blocco non riuscita.',
        emptyTitle: 'Lezione vuota',
        emptyHint: 'Aggiungi un primo blocco usando la barra qui sotto.',
        viewAsLearnerButton: 'Anteprima studente',
        previewButton: 'Anteprima',
        editModeButton: 'Modifica',
        outlineHeading: 'Indice della lezione',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Editar lección',
        addBlockBarLabel: 'Añadir un bloque',
        addBlockHint: 'Añadir un bloque a la lección',
        deleteBlockAria: 'Eliminar el bloque',
        deleteBlockConfirm: '¿Eliminar este bloque?',
        reorderSuccessToast: 'Orden de los bloques guardado.',
        reorderErrorToast: 'No se pudo guardar el nuevo orden.',
        blockAddedToast: 'Bloque añadido.',
        blockDeletedToast: 'Bloque eliminado.',
        blockUpdatedToast: 'Bloque actualizado.',
        blockErrorToast: 'La operación sobre el bloque falló.',
        emptyTitle: 'Lección vacía',
        emptyHint: 'Añade un primer bloque desde la barra de abajo.',
        viewAsLearnerButton: 'Vista del estudiante',
        previewButton: 'Vista previa',
        editModeButton: 'Editar',
        outlineHeading: 'Índice de la lección',
      };
    default:
      return {
        pageTitle: 'Edit lesson',
        addBlockBarLabel: 'Add a block',
        addBlockHint: 'Add a block to the lesson',
        deleteBlockAria: 'Delete block',
        deleteBlockConfirm: 'Delete this block?',
        reorderSuccessToast: 'Block order saved.',
        reorderErrorToast: 'Could not save the new order.',
        blockAddedToast: 'Block added.',
        blockDeletedToast: 'Block deleted.',
        blockUpdatedToast: 'Block updated.',
        blockErrorToast: 'Block operation failed.',
        emptyTitle: 'Empty lesson',
        emptyHint: 'Add a first block from the bar below.',
        viewAsLearnerButton: 'View as learner',
        previewButton: 'Preview',
        editModeButton: 'Edit',
        outlineHeading: 'Lesson outline',
      };
  }
}
