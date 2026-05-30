import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

/**
 * Localised labels for the shared ``<app-block-list-editor>`` host
 * — the empty hint shown when no blocks exist yet, the toast strings
 * for add / delete / reorder, and the bottom "add block" bar.
 *
 * Kept separate from the per-type ``block-editors.i18n.ts`` because
 * the sub-component i18n covers fields inside each editor while this
 * one covers the surrounding list shell.
 */
export interface BlockListEditorUiText {
  emptyHint: string;
  addBlockBarLabel: string;
  addBlockHint: string;
  deleteBlockAria: string;
  /** Header button: switch a readonly block back to edit mode. */
  editBlockAria: string;
  editBlockLabel: string;
  /** Bottom-right footer buttons of an editor in edit mode. */
  saveBlockLabel: string;
  cancelBlockLabel: string;
  blockAddedToast: string;
  blockSavedToast: string;
  blockDeletedToast: string;
  blockErrorToast: string;
  reorderSuccessToast: string;
  reorderErrorToast: string;
}

export function getBlockListEditorUiText(
  lang: LanguageEnumDto | string | null | undefined,
): BlockListEditorUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        emptyHint: 'Aucun bloc pour l’instant. Ajoutez-en un avec la barre ci-dessous.',
        addBlockBarLabel: 'Ajouter un bloc',
        addBlockHint: 'Ajouter un bloc :',
        deleteBlockAria: 'Supprimer le bloc',
        editBlockAria: 'Éditer le bloc',
        editBlockLabel: 'Éditer',
        saveBlockLabel: 'Enregistrer',
        cancelBlockLabel: 'Annuler',
        blockAddedToast: 'Bloc ajouté.',
        blockSavedToast: 'Bloc enregistré.',
        blockDeletedToast: 'Bloc supprimé.',
        blockErrorToast: 'Impossible de modifier le bloc.',
        reorderSuccessToast: 'Ordre mis à jour.',
        reorderErrorToast: 'Impossible de réordonner les blocs.',
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        emptyHint: 'Nog geen blokken. Voeg er een toe met de balk hieronder.',
        addBlockBarLabel: 'Een blok toevoegen',
        addBlockHint: 'Een blok toevoegen:',
        deleteBlockAria: 'Blok verwijderen',
        editBlockAria: 'Blok bewerken',
        editBlockLabel: 'Bewerken',
        saveBlockLabel: 'Opslaan',
        cancelBlockLabel: 'Annuleren',
        blockAddedToast: 'Blok toegevoegd.',
        blockSavedToast: 'Blok opgeslagen.',
        blockDeletedToast: 'Blok verwijderd.',
        blockErrorToast: 'Kan het blok niet wijzigen.',
        reorderSuccessToast: 'Volgorde bijgewerkt.',
        reorderErrorToast: 'Kan de blokken niet opnieuw ordenen.',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        emptyHint: 'Ancora nessun blocco. Aggiungine uno con la barra qui sotto.',
        addBlockBarLabel: 'Aggiungere un blocco',
        addBlockHint: 'Aggiungere un blocco:',
        deleteBlockAria: 'Elimina il blocco',
        editBlockAria: 'Modifica il blocco',
        editBlockLabel: 'Modifica',
        saveBlockLabel: 'Salva',
        cancelBlockLabel: 'Annulla',
        blockAddedToast: 'Blocco aggiunto.',
        blockSavedToast: 'Blocco salvato.',
        blockDeletedToast: 'Blocco eliminato.',
        blockErrorToast: 'Impossibile modificare il blocco.',
        reorderSuccessToast: 'Ordine aggiornato.',
        reorderErrorToast: 'Impossibile riordinare i blocchi.',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        emptyHint: 'Aún no hay bloques. Añade uno con la barra de abajo.',
        addBlockBarLabel: 'Añadir un bloque',
        addBlockHint: 'Añadir un bloque:',
        deleteBlockAria: 'Eliminar el bloque',
        editBlockAria: 'Editar el bloque',
        editBlockLabel: 'Editar',
        saveBlockLabel: 'Guardar',
        cancelBlockLabel: 'Cancelar',
        blockAddedToast: 'Bloque añadido.',
        blockSavedToast: 'Bloque guardado.',
        blockDeletedToast: 'Bloque eliminado.',
        blockErrorToast: 'No se pudo modificar el bloque.',
        reorderSuccessToast: 'Orden actualizado.',
        reorderErrorToast: 'No se pudieron reordenar los bloques.',
      };
    default:
      return {
        emptyHint: 'No blocks yet. Add one from the bar below.',
        addBlockBarLabel: 'Add a block',
        addBlockHint: 'Add a block:',
        deleteBlockAria: 'Delete block',
        editBlockAria: 'Edit block',
        editBlockLabel: 'Edit',
        saveBlockLabel: 'Save',
        cancelBlockLabel: 'Cancel',
        blockAddedToast: 'Block added.',
        blockSavedToast: 'Block saved.',
        blockDeletedToast: 'Block deleted.',
        blockErrorToast: 'Could not modify the block.',
        reorderSuccessToast: 'Order updated.',
        reorderErrorToast: 'Could not reorder the blocks.',
      };
  }
}
