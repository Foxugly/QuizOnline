import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

import {shellUiText} from '../catalog-registry';
import type {UiText} from './types';

export type {UiText} from './types';

/**
 * Dictionnaire du shell. Les catalogues vivent desormais dans
 * ``public/i18n/<lang>.json`` (STANDARD-frontend-layout.md §5bis) et sont
 * charges au bootstrap ; la signature de ce getter est inchangee, donc aucun
 * des ~126 fichiers consommateurs n'a bouge.
 */
export function getUiText(lang: LanguageEnumDto | string | null | undefined): UiText {
  return shellUiText<UiText>(lang);
}
