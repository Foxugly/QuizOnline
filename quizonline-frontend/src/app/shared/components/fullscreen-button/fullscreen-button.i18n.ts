import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {pageUiText} from '../../i18n/catalog-registry';

/** i18n for the shared ``<app-fullscreen-button>`` — tooltip / aria-label
 *  for the enter and exit states. */
export interface FullscreenButtonUiText {
  enter: string;
  exit: string;
}

export function getFullscreenButtonUiText(
  lang: LanguageEnumDto | string | null | undefined,
): FullscreenButtonUiText {
  return pageUiText<FullscreenButtonUiText>('fullscreenButton', lang);
}
