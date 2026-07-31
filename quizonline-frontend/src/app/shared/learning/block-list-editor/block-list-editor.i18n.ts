import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {pageUiText} from '../../i18n/catalog-registry';

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
  return pageUiText<BlockListEditorUiText>('blockListEditor', lang);
}
