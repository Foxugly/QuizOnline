import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

import {editorUiText} from '../catalog-registry';
import type {EditorUiText} from './types';

export type {EditorUiText} from './types';

/**
 * Dictionnaire editeur / admin. Meme migration que le shell : les donnees
 * viennent de ``public/i18n/<lang>.json``, la signature ne change pas.
 */
export function getEditorUiText(
  lang: LanguageEnumDto | string | null | undefined,
): EditorUiText {
  return editorUiText<EditorUiText>(lang);
}
