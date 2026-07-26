import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

/** i18n for the shared ``<app-fullscreen-button>`` — tooltip / aria-label
 *  for the enter and exit states. */
export interface FullscreenButtonUiText {
  enter: string;
  exit: string;
}

export function getFullscreenButtonUiText(
  lang: LanguageEnumDto | string | null | undefined,
): FullscreenButtonUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {enter: 'Plein écran', exit: 'Quitter le plein écran'};
    case LanguageEnumDto.Nl:
    case 'nl':
      return {enter: 'Volledig scherm', exit: 'Volledig scherm verlaten'};
    case LanguageEnumDto.It:
    case 'it':
      return {enter: 'Schermo intero', exit: 'Esci da schermo intero'};
    case LanguageEnumDto.Es:
    case 'es':
      return {enter: 'Pantalla completa', exit: 'Salir de pantalla completa'};
    default:
      return {enter: 'Fullscreen', exit: 'Exit fullscreen'};
  }
}
